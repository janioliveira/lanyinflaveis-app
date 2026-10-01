"""Lany Infláveis - Main FastAPI server."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import hashlib
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Any
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies,
    get_token_from_request, get_current_user_from_db,
)
from seed import seed_all
from whatsapp import build_wa_link, render_message, TEMPLATES, dispatch as wa_dispatch


async def create_notification(db, kind: str, reservation_id: str, extra: dict = None):
    """Create a WhatsApp notification for a reservation event."""
    try:
        reserva = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
        if not reserva:
            return
        # Resolve customer + phone
        phone, name = "", ""
        try:
            cust = await db.customers.find_one({"_id": ObjectId(reserva["customer_id"])})
            if cust:
                phone = cust.get("whatsapp") or cust.get("telefone") or ""
                name = cust.get("nome", "")
        except Exception:
            pass
        if not name:
            try:
                u = await db.users.find_one({"_id": ObjectId(reserva["customer_id"])})
                if u:
                    name = u.get("name", "")
            except Exception:
                pass
        toys_names = []
        for tid in reserva.get("toy_ids", []):
            try:
                t = await db.toys.find_one({"_id": ObjectId(tid)})
                if t: toys_names.append(t["nome"])
            except Exception:
                pass
        frontend = os.environ.get("FRONTEND_URL", "")
        ctx = {
            "NOME": name or "cliente",
            "NUMERO": reserva.get("numero", ""),
            "DATA_EVENTO": reserva["start_datetime"][:10],
            "HORARIO": reserva["start_datetime"][11:16],
            "BRINQUEDOS": ", ".join(toys_names) or "—",
            "VALOR": f"{reserva.get('valor_total', 0):.2f}",
            "LOCAL": reserva.get("endereco_evento", ""),
            "LINK": f"{frontend}/portal",
        }
        if extra: ctx.update(extra)
        template = TEMPLATES.get(kind, "")
        message = render_message(template, ctx)
        result = await wa_dispatch(phone, message)
        await db.notifications.insert_one({
            "kind": kind,
            "reservation_id": reservation_id,
            "customer_id": reserva.get("customer_id"),
            "customer_name": name,
            "phone": phone,
            "message": message,
            "wa_link": result.get("wa_link", ""),
            "provider": result.get("provider", "manual"),
            "status": result.get("status", "pending"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error(f"Notification error: {e}")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────── DB ───────────────────────
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Lany Infláveis API")
api = APIRouter(prefix="/api")


# ─────────────────────── Helpers ───────────────────────
def to_iso(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def clean_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


async def get_current_user(request: Request) -> dict:
    token = get_token_from_request(request)
    return await get_current_user_from_db(db, token)


def require_role(*roles):
    async def _check(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Sem permissão")
        return user
    return _check


require_admin = require_role("admin")
require_staff = require_role("admin", "employee")


# ─────────────────────── AUTH ───────────────────────
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Optional[str] = "customer"  # customers only self-register


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    # Only customers can self register
    role = "customer"
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": role,
        "token_version": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    user_id = str(res.inserted_id)
    access = create_access_token(user_id, email, role, 0)
    refresh = create_refresh_token(user_id, 0)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": payload.name, "role": role}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    uid = str(user["_id"])
    ver = user.get("token_version", 0)
    access = create_access_token(uid, email, user["role"], ver)
    refresh = create_refresh_token(uid, ver)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user["name"], "role": user["role"]}


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    import jwt
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(rt, os.environ["JWT_SECRET"], algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Session expired")
        access = create_access_token(str(user["_id"]), user["email"], user["role"], user.get("token_version", 0))
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=60*60*12, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─────────────────────── COMPANY ───────────────────────
@api.get("/company")
async def get_company():
    doc = await db.company.find_one({})
    return clean_doc(doc) if doc else {}


@api.put("/company")
async def update_company(payload: dict, user: dict = Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.company.update_one({}, {"$set": payload}, upsert=True)
    doc = await db.company.find_one({})
    return clean_doc(doc)


# ─────────────────────── CUSTOMERS ───────────────────────
@api.post("/customers")
async def create_customer(payload: dict, user: dict = Depends(require_staff)):
    payload["created_at"] = datetime.now(timezone.utc).isoformat()
    payload["deleted"] = False
    res = await db.customers.insert_one(payload)
    doc = await db.customers.find_one({"_id": res.inserted_id})
    return clean_doc(doc)


@api.get("/customers")
async def list_customers(q: Optional[str] = None, user: dict = Depends(require_staff)):
    filt = {"deleted": {"$ne": True}}
    if q:
        filt["$or"] = [
            {"nome": {"$regex": q, "$options": "i"}},
            {"cpf_cnpj": {"$regex": q, "$options": "i"}},
            {"telefone": {"$regex": q, "$options": "i"}},
            {"whatsapp": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.customers.find(filt).sort("created_at", -1).to_list(500)
    return [clean_doc(d) for d in docs]


@api.get("/customers/{cid}")
async def get_customer(cid: str, user: dict = Depends(require_staff)):
    doc = await db.customers.find_one({"_id": ObjectId(cid)})
    if not doc:
        raise HTTPException(404, "Cliente não encontrado")
    return clean_doc(doc)


@api.put("/customers/{cid}")
async def update_customer(cid: str, payload: dict, user: dict = Depends(require_staff)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.customers.update_one({"_id": ObjectId(cid)}, {"$set": payload})
    doc = await db.customers.find_one({"_id": ObjectId(cid)})
    return clean_doc(doc)


@api.delete("/customers/{cid}")
async def delete_customer(cid: str, user: dict = Depends(require_admin)):
    await db.customers.update_one({"_id": ObjectId(cid)}, {"$set": {"deleted": True}})
    return {"ok": True}


# ─────────────────────── TOYS ───────────────────────
@api.post("/toys")
async def create_toy(payload: dict, user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    payload.update({"created_at": now, "updated_at": now, "deleted": False})
    res = await db.toys.insert_one(payload)
    doc = await db.toys.find_one({"_id": res.inserted_id})
    return clean_doc(doc)


@api.get("/toys")
async def list_toys(public: bool = False):
    filt = {"deleted": {"$ne": True}}
    if public:
        filt["status"] = "ativo"
    docs = await db.toys.find(filt).sort("nome", 1).to_list(500)
    return [clean_doc(d) for d in docs]


@api.get("/toys/{tid}")
async def get_toy(tid: str):
    doc = await db.toys.find_one({"_id": ObjectId(tid)})
    if not doc:
        raise HTTPException(404, "Brinquedo não encontrado")
    return clean_doc(doc)


@api.put("/toys/{tid}")
async def update_toy(tid: str, payload: dict, user: dict = Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.toys.update_one({"_id": ObjectId(tid)}, {"$set": payload})
    doc = await db.toys.find_one({"_id": ObjectId(tid)})
    return clean_doc(doc)


@api.delete("/toys/{tid}")
async def delete_toy(tid: str, user: dict = Depends(require_admin)):
    await db.toys.update_one({"_id": ObjectId(tid)}, {"$set": {"deleted": True}})
    return {"ok": True}


# ─────────────────────── AVAILABILITY ───────────────────────
async def _check_conflict(toy_id: str, start_iso: str, end_iso: str, exclude_res: Optional[str] = None) -> bool:
    filt: dict = {
        "toy_ids": toy_id,
        "status": {"$in": ["pre_reservada", "confirmada", "em_utilizacao"]},
        "start_datetime": {"$lt": end_iso},
        "end_datetime": {"$gt": start_iso},
    }
    if exclude_res:
        filt["_id"] = {"$ne": ObjectId(exclude_res)}
    return await db.reservations.find_one(filt) is not None


@api.get("/availability")
async def check_availability(toy_id: str, start: str, end: str):
    conflict = await _check_conflict(toy_id, start, end)
    return {"available": not conflict}


# ─────────────────────── RESERVATIONS ───────────────────────
class ReservationIn(BaseModel):
    customer_id: str
    toy_ids: List[str]
    start_datetime: str  # ISO
    end_datetime: str
    endereco_evento: str
    valor_brinquedos: float = 0
    servicos_adicionais: float = 0
    taxa_deslocamento: float = 0
    desconto: float = 0
    valor_total: float = 0
    observacoes: Optional[str] = ""
    status: Optional[str] = "pre_reservada"


@api.post("/reservations")
async def create_reservation(payload: ReservationIn, user: dict = Depends(get_current_user)):
    for tid in payload.toy_ids:
        if await _check_conflict(tid, payload.start_datetime, payload.end_datetime):
            raise HTTPException(409, f"Brinquedo {tid} indisponível no período")
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["created_by"] = user["id"]
    doc["numero"] = f"R{int(datetime.now().timestamp())}"
    res = await db.reservations.insert_one(doc)
    saved = await db.reservations.find_one({"_id": res.inserted_id})
    await create_notification(db, "new_reservation", str(res.inserted_id))
    return clean_doc(saved)


@api.get("/reservations")
async def list_reservations(
    start: Optional[str] = None,
    end: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    filt: dict = {}
    if user["role"] == "customer":
        filt["customer_id"] = user["id"]
    elif customer_id:
        filt["customer_id"] = customer_id
    if start and end:
        filt["start_datetime"] = {"$lt": end}
        filt["end_datetime"] = {"$gt": start}
    docs = await db.reservations.find(filt).sort("start_datetime", -1).to_list(1000)
    return [clean_doc(d) for d in docs]


@api.get("/reservations/{rid}")
async def get_reservation(rid: str, user: dict = Depends(get_current_user)):
    doc = await db.reservations.find_one({"_id": ObjectId(rid)})
    if not doc:
        raise HTTPException(404, "Reserva não encontrada")
    if user["role"] == "customer" and doc.get("customer_id") != user["id"]:
        raise HTTPException(403, "Sem permissão")
    return clean_doc(doc)


@api.put("/reservations/{rid}")
async def update_reservation(rid: str, payload: dict, user: dict = Depends(require_staff)):
    # If dates or toys change, re-check conflicts
    if any(k in payload for k in ["toy_ids", "start_datetime", "end_datetime"]):
        current = await db.reservations.find_one({"_id": ObjectId(rid)})
        toys = payload.get("toy_ids", current["toy_ids"])
        s = payload.get("start_datetime", current["start_datetime"])
        e = payload.get("end_datetime", current["end_datetime"])
        for tid in toys:
            if await _check_conflict(tid, s, e, exclude_res=rid):
                raise HTTPException(409, "Conflito de horário")
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.reservations.update_one({"_id": ObjectId(rid)}, {"$set": payload})
    doc = await db.reservations.find_one({"_id": ObjectId(rid)})
    return clean_doc(doc)


@api.delete("/reservations/{rid}")
async def cancel_reservation(rid: str, user: dict = Depends(require_staff)):
    await db.reservations.update_one(
        {"_id": ObjectId(rid)},
        {"$set": {"status": "cancelada", "cancelled_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


# ─────────────────────── QUOTES ───────────────────────
@api.post("/quotes")
async def create_quote(payload: dict, user: dict = Depends(require_staff)):
    now = datetime.now(timezone.utc)
    payload["created_at"] = now.isoformat()
    payload["numero"] = f"Q{int(now.timestamp())}"
    payload["validade"] = (now + timedelta(days=7)).isoformat()
    payload.setdefault("status", "rascunho")
    res = await db.quotes.insert_one(payload)
    doc = await db.quotes.find_one({"_id": res.inserted_id})
    return clean_doc(doc)


@api.get("/quotes")
async def list_quotes(user: dict = Depends(require_staff)):
    docs = await db.quotes.find({}).sort("created_at", -1).to_list(500)
    return [clean_doc(d) for d in docs]


@api.put("/quotes/{qid}")
async def update_quote(qid: str, payload: dict, user: dict = Depends(require_staff)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.quotes.update_one({"_id": ObjectId(qid)}, {"$set": payload})
    doc = await db.quotes.find_one({"_id": ObjectId(qid)})
    return clean_doc(doc)


@api.post("/quotes/{qid}/convert")
async def convert_quote(qid: str, user: dict = Depends(require_staff)):
    q = await db.quotes.find_one({"_id": ObjectId(qid)})
    if not q:
        raise HTTPException(404, "Orçamento não encontrado")
    for tid in q.get("toy_ids", []):
        if await _check_conflict(tid, q["start_datetime"], q["end_datetime"]):
            raise HTTPException(409, "Brinquedo indisponível")
    reserva = {
        "customer_id": q["customer_id"],
        "toy_ids": q["toy_ids"],
        "start_datetime": q["start_datetime"],
        "end_datetime": q["end_datetime"],
        "endereco_evento": q.get("endereco_evento", ""),
        "valor_total": q.get("valor_total", 0),
        "status": "pre_reservada",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "numero": f"R{int(datetime.now().timestamp())}",
        "quote_id": qid,
    }
    res = await db.reservations.insert_one(reserva)
    await db.quotes.update_one({"_id": ObjectId(qid)}, {"$set": {"status": "convertido"}})
    saved = await db.reservations.find_one({"_id": res.inserted_id})
    return clean_doc(saved)


# ─────────────────────── PAYMENTS ───────────────────────
class PaymentIn(BaseModel):
    reservation_id: str
    amount: float
    method: str  # pix, credit_card, debit_card, cash, transfer
    installments: Optional[int] = 1


@api.post("/payments")
async def create_payment(payload: PaymentIn, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    doc = {
        "reservation_id": payload.reservation_id,
        "amount": payload.amount,
        "method": payload.method,
        "installments": payload.installments,
        "status": "pending",
        "gateway": "mock",
        "transaction_id": tx_id,
        "created_at": now.isoformat(),
        "created_by": user["id"],
    }
    if payload.method == "pix":
        # Mock PIX QR code and copy-paste
        pix_code = f"00020126360014BR.GOV.BCB.PIX0114+55{tx_id}5204000053039865802BR5913Lany Inflaveis6009SaoPaulo62070503***6304ABCD"
        doc["pix_qr_code"] = pix_code
        doc["pix_expires_at"] = (now + timedelta(minutes=30)).isoformat()
    elif payload.method == "credit_card":
        doc["last4"] = "0000"  # in real flow, gateway returns this
    res = await db.payments.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api.get("/payments")
async def list_payments(reservation_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    filt: dict = {}
    if reservation_id:
        filt["reservation_id"] = reservation_id
    docs = await db.payments.find(filt).sort("created_at", -1).to_list(500)
    return [clean_doc(d) for d in docs]


@api.post("/payments/{pid}/simulate-confirm")
async def simulate_payment_confirm(pid: str, user: dict = Depends(get_current_user)):
    """Dev-only: simulate gateway confirmation. In production this is done via webhook."""
    payment = await db.payments.find_one({"_id": ObjectId(pid)})
    if not payment:
        raise HTTPException(404, "Pagamento não encontrado")
    await db.payments.update_one(
        {"_id": ObjectId(pid)},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
    )
    # Update reservation status if fully paid
    total_paid = 0
    async for p in db.payments.find({"reservation_id": payment["reservation_id"], "status": "paid"}):
        total_paid += p["amount"]
    total_paid += payment["amount"]  # this one just became paid
    reserva = await db.reservations.find_one({"_id": ObjectId(payment["reservation_id"])})
    if reserva and total_paid >= reserva.get("valor_total", 0):
        await db.reservations.update_one(
            {"_id": ObjectId(payment["reservation_id"])},
            {"$set": {"status": "confirmada"}},
        )
    # Financial entry
    await db.financial_entries.insert_one({
        "tipo": "entrada",
        "categoria": "Pagamento cliente",
        "valor": payment["amount"],
        "descricao": f"Pagamento reserva #{payment['reservation_id']}",
        "reservation_id": payment["reservation_id"],
        "payment_id": pid,
        "data": datetime.now(timezone.utc).isoformat(),
    })
    await create_notification(db, "payment_confirmed", payment["reservation_id"], {"VALOR": f"{payment['amount']:.2f}"})
    return {"ok": True}


# ─────────────────────── NOTIFICATIONS (WhatsApp) ───────────────────────
@api.get("/notifications")
async def list_notifications(status: Optional[str] = None, user: dict = Depends(require_staff)):
    filt: dict = {}
    if status:
        filt["status"] = status
    docs = await db.notifications.find(filt).sort("created_at", -1).to_list(500)
    return [clean_doc(d) for d in docs]


@api.post("/notifications/{nid}/mark-sent")
async def mark_sent(nid: str, user: dict = Depends(require_staff)):
    await db.notifications.update_one(
        {"_id": ObjectId(nid)},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat(), "sent_by": user["id"]}},
    )
    return {"ok": True}


@api.post("/notifications/reminders/generate")
async def generate_event_reminders(user: dict = Depends(require_staff)):
    """Generate 24h-before-event reminders for confirmed reservations happening tomorrow."""
    now = datetime.now(timezone.utc)
    start = (now + timedelta(hours=20)).isoformat()
    end = (now + timedelta(hours=28)).isoformat()
    created = 0
    async for r in db.reservations.find({
        "status": {"$in": ["confirmada", "pre_reservada"]},
        "start_datetime": {"$gte": start, "$lte": end},
    }):
        rid = str(r["_id"])
        # Skip if already sent today
        exists = await db.notifications.find_one({
            "kind": "event_reminder",
            "reservation_id": rid,
            "created_at": {"$gte": now.replace(hour=0, minute=0).isoformat()},
        })
        if exists:
            continue
        await create_notification(db, "event_reminder", rid)
        created += 1
    return {"created": created}


@api.post("/webhooks/payment")
async def payment_webhook(payload: dict, request: Request):
    """Endpoint for gateway webhooks. Validate signature in production."""
    event = payload.get("event", "")
    tx_id = payload.get("transaction_id", "")
    logger.info(f"Payment webhook received: {event} {tx_id}")
    if event in ("payment.approved", "payment.paid"):
        payment = await db.payments.find_one({"transaction_id": tx_id})
        if payment:
            await db.payments.update_one(
                {"_id": payment["_id"]},
                {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
            )
    return {"received": True}


# ─────────────────────── CONTRACTS ───────────────────────
@api.get("/contract-templates")
async def list_templates(user: dict = Depends(require_admin)):
    docs = await db.contract_templates.find({}).to_list(50)
    return [clean_doc(d) for d in docs]


@api.put("/contract-templates/default")
async def update_default_template(payload: dict, user: dict = Depends(require_admin)):
    await db.contract_templates.update_one(
        {"is_default": True},
        {"$set": {"conteudo": payload.get("conteudo", ""), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    doc = await db.contract_templates.find_one({"is_default": True})
    return clean_doc(doc)


@api.post("/reservations/{rid}/contract")
async def generate_contract(rid: str, user: dict = Depends(get_current_user)):
    reserva = await db.reservations.find_one({"_id": ObjectId(rid)})
    if not reserva:
        raise HTTPException(404, "Reserva não encontrada")
    existing = await db.contracts.find_one({"reservation_id": rid})
    if existing:
        return clean_doc(existing)
    template = await db.contract_templates.find_one({"is_default": True})
    if not template:
        raise HTTPException(400, "Template de contrato não configurado")

    customer = await db.customers.find_one({"_id": ObjectId(reserva["customer_id"])}) if ObjectId.is_valid(reserva.get("customer_id", "")) else None
    if not customer:
        # try users
        try:
            customer_user = await db.users.find_one({"_id": ObjectId(reserva["customer_id"])})
            customer = {"nome": customer_user.get("name", ""), "cpf_cnpj": "", "endereco": ""} if customer_user else {}
        except Exception:
            customer = {}

    toys = []
    for tid in reserva.get("toy_ids", []):
        t = await db.toys.find_one({"_id": ObjectId(tid)})
        if t:
            toys.append(t["nome"])
    total_paid = 0
    async for p in db.payments.find({"reservation_id": rid, "status": "paid"}):
        total_paid += p["amount"]

    valor_total = reserva.get("valor_total", 0)
    valores = {
        "{NOME_CLIENTE}": customer.get("nome", ""),
        "{CPF_CLIENTE}": customer.get("cpf_cnpj", ""),
        "{ENDERECO_CLIENTE}": customer.get("endereco", ""),
        "{DATA_EVENTO}": reserva["start_datetime"][:10],
        "{HORARIO_INICIO}": reserva["start_datetime"][11:16],
        "{HORARIO_FIM}": reserva["end_datetime"][11:16],
        "{LOCAL_EVENTO}": reserva.get("endereco_evento", ""),
        "{BRINQUEDO}": ", ".join(toys),
        "{VALOR_TOTAL}": f"{valor_total:.2f}",
        "{VALOR_PAGO}": f"{total_paid:.2f}",
        "{VALOR_RESTANTE}": f"{valor_total - total_paid:.2f}",
        "{FORMA_PAGAMENTO}": reserva.get("forma_pagamento", "A definir"),
        "{DATA_CONTRATO}": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
    }
    content = template["conteudo"]
    for k, v in valores.items():
        content = content.replace(k, str(v))

    doc = {
        "reservation_id": rid,
        "content": content,
        "status": "pendente",  # pendente, assinado
        "version": 1,
        "hash": hashlib.sha256(content.encode()).hexdigest(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.contracts.insert_one(doc)
    saved = await db.contracts.find_one({"_id": res.inserted_id})
    return clean_doc(saved)


class ContractSignIn(BaseModel):
    nome: str
    cpf: str
    aceito: bool


@api.post("/contracts/{cid}/sign")
async def sign_contract(cid: str, payload: ContractSignIn, request: Request, user: dict = Depends(get_current_user)):
    if not payload.aceito:
        raise HTTPException(400, "É necessário aceitar os termos")
    contract = await db.contracts.find_one({"_id": ObjectId(cid)})
    if not contract:
        raise HTTPException(404, "Contrato não encontrado")
    ip = request.client.host if request.client else ""
    now = datetime.now(timezone.utc).isoformat()
    await db.contracts.update_one(
        {"_id": ObjectId(cid)},
        {"$set": {
            "status": "assinado",
            "signed_at": now,
            "signed_by_name": payload.nome,
            "signed_by_cpf": payload.cpf,
            "signed_ip": ip,
            "signed_user_id": user["id"],
        }},
    )
    doc = await db.contracts.find_one({"_id": ObjectId(cid)})
    return clean_doc(doc)


@api.get("/contracts")
async def list_contracts(user: dict = Depends(get_current_user)):
    filt = {}
    if user["role"] == "customer":
        # find reservations of this customer
        res_ids = [str(r["_id"]) async for r in db.reservations.find({"customer_id": user["id"]}, {"_id": 1})]
        filt = {"reservation_id": {"$in": res_ids}}
    docs = await db.contracts.find(filt).sort("created_at", -1).to_list(500)
    return [clean_doc(d) for d in docs]


@api.get("/contracts/{cid}")
async def get_contract(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.contracts.find_one({"_id": ObjectId(cid)})
    if not doc:
        raise HTTPException(404, "Contrato não encontrado")
    return clean_doc(doc)


# ─────────────────────── FINANCIAL ───────────────────────
@api.post("/financial")
async def create_entry(payload: dict, user: dict = Depends(require_admin)):
    payload["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.financial_entries.insert_one(payload)
    doc = await db.financial_entries.find_one({"_id": res.inserted_id})
    return clean_doc(doc)


@api.get("/financial")
async def list_entries(tipo: Optional[str] = None, user: dict = Depends(require_admin)):
    filt: dict = {}
    if tipo:
        filt["tipo"] = tipo
    docs = await db.financial_entries.find(filt).sort("data", -1).to_list(1000)
    return [clean_doc(d) for d in docs]


@api.delete("/financial/{eid}")
async def delete_entry(eid: str, user: dict = Depends(require_admin)):
    await db.financial_entries.delete_one({"_id": ObjectId(eid)})
    return {"ok": True}


# ─────────────────────── DASHBOARD ───────────────────────
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(require_staff)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    tomorrow = (now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    week_end = (now + timedelta(days=7)).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    res_today = await db.reservations.count_documents({"start_datetime": {"$gte": today, "$lt": tomorrow}})
    res_week = await db.reservations.count_documents({"start_datetime": {"$gte": today, "$lte": week_end}})
    res_month = await db.reservations.count_documents({"start_datetime": {"$gte": month_start}})
    toys_total = await db.toys.count_documents({"deleted": {"$ne": True}, "status": "ativo"})

    # Revenue this month
    revenue = 0
    async for e in db.financial_entries.find({"tipo": "entrada", "data": {"$gte": month_start}}):
        revenue += e.get("valor", 0)

    # Pending payments
    pending = 0
    async for p in db.payments.find({"status": "pending"}):
        pending += p.get("amount", 0)

    # Next event
    next_event = await db.reservations.find_one(
        {"start_datetime": {"$gte": now.isoformat()}, "status": {"$ne": "cancelada"}},
        sort=[("start_datetime", 1)],
    )

    # Top toys
    pipeline = [
        {"$match": {"status": {"$ne": "cancelada"}}},
        {"$unwind": "$toy_ids"},
        {"$group": {"_id": "$toy_ids", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top = []
    async for row in db.reservations.aggregate(pipeline):
        try:
            t = await db.toys.find_one({"_id": ObjectId(row["_id"])})
            if t:
                top.append({"nome": t["nome"], "count": row["count"]})
        except Exception:
            pass

    # Revenue per month (last 6)
    months = []
    for i in range(5, -1, -1):
        target = now.replace(day=1) - timedelta(days=30 * i)
        start = target.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (start + timedelta(days=32)).replace(day=1)
        total = 0
        async for e in db.financial_entries.find({
            "tipo": "entrada",
            "data": {"$gte": start.isoformat(), "$lt": next_month.isoformat()},
        }):
            total += e.get("valor", 0)
        months.append({"mes": start.strftime("%b"), "valor": total})

    return {
        "reservas_hoje": res_today,
        "reservas_semana": res_week,
        "reservas_mes": res_month,
        "brinquedos_ativos": toys_total,
        "faturamento_mes": revenue,
        "pagamentos_pendentes": pending,
        "proximo_evento": clean_doc(next_event) if next_event else None,
        "top_brinquedos": top,
        "faturamento_por_mes": months,
    }


# ─────────────────────── USERS (admin) ───────────────────────
@api.get("/users")
async def list_users(user: dict = Depends(require_admin)):
    docs = await db.users.find({}).to_list(500)
    return [clean_doc(d) for d in docs]


@api.post("/users")
async def create_user(payload: dict, user: dict = Depends(require_admin)):
    email = payload["email"].lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "E-mail já cadastrado")
    doc = {
        "email": email,
        "password_hash": hash_password(payload["password"]),
        "name": payload["name"],
        "role": payload.get("role", "employee"),
        "token_version": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    saved = await db.users.find_one({"_id": res.inserted_id})
    return clean_doc(saved)


@api.delete("/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(require_admin)):
    if uid == user["id"]:
        raise HTTPException(400, "Não é possível excluir a si mesmo")
    await db.users.delete_one({"_id": ObjectId(uid)})
    return {"ok": True}


# ─────────────────────── STARTUP (idempotent — safe for serverless cold starts) ───────────────────────
_initialized = False


async def _ensure_initialized():
    """Lazy init called from a middleware so it works both for long-running
    uvicorn (local/supervisor) and short-lived Vercel serverless invocations."""
    global _initialized
    if _initialized:
        return
    _initialized = True
    try:
        await db.users.create_index("email", unique=True)
        await db.reservations.create_index([("start_datetime", 1), ("end_datetime", 1)])
        await db.reservations.create_index("customer_id")
        await db.toys.create_index("status")
        await seed_all(db)
        logger.info("Lany Infláveis API initialized")
    except Exception as e:
        logger.error(f"Init error (will retry on next request): {e}")
        _initialized = False


@app.middleware("http")
async def init_once(request: Request, call_next):
    await _ensure_initialized()
    return await call_next(request)


@app.on_event("startup")
async def startup():
    await _ensure_initialized()


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

# CORS — accept the frontend origin AND same-origin (empty FRONTEND_URL on Vercel is fine)
frontend_url = os.environ.get("FRONTEND_URL", "").strip()
origins = []
if frontend_url:
    origins.append(frontend_url)
extra = os.environ.get("CORS_ORIGINS", "").split(",")
for o in extra:
    o = o.strip()
    if o and o not in origins and o != "*":
        origins.append(o)

# On Vercel the API is same-origin with the SPA, so an empty allowed-origins list
# still works. For dev/preview we need the explicit origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
