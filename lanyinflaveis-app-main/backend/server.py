"""Lany Infláveis - Main FastAPI server (Firebase / Firestore Version)."""
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
from pydantic import BaseModel, EmailStr, Field

import firebase_admin
from firebase_admin import credentials, firestore_async
from google.cloud.firestore_v1.base_query import FieldFilter

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies,
    get_token_from_request, get_current_user_from_db,
)
from seed import seed_all
from whatsapp import build_wa_link, render_message, TEMPLATES, dispatch as wa_dispatch

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────── DB CONFIGURATION ───────────────────────
# Inicializa o Firebase Admin SDK
# Recomenda-se definir a variável GOOGLE_APPLICATION_CREDENTIALS apontando para o arquivo .json
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

# Busca a chave nas variáveis do Vercel
firebase_env = os.environ.get("FIREBASE_CREDENTIALS")

if firebase_env:
    # Modo Produção (Vercel)
    cert_dict = json.loads(firebase_env)
    cred = credentials.Certificate(cert_dict)
else:
    # Modo Local (seu computador)
    cred = credentials.Certificate("chave-firebase.json")

# Evita erro de inicialização duplicada no Vercel
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.AsyncClient() # ou firestore.client(), dependendo de como você estava usando

# Cliente Assíncrono do Firestore
db = firestore_async.client()

app = FastAPI(title="Lany Infláveis API")
api = APIRouter(prefix="/api")

# ─────────────────────── Helpers ───────────────────────
def to_iso(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v

def clean_doc(doc_snapshot) -> dict:
    """Converte um DocumentSnapshot do Firestore para dicionário padronizado."""
    if not doc_snapshot.exists:
        return {}
    data = doc_snapshot.to_dict()
    data["id"] = doc_snapshot.id
    data.pop("password_hash", None)
    return data

async def get_current_user(request: Request) -> dict:
    token = get_token_from_request(request)
    # A função original do auth.py precisará ser adaptada para Firestore, 
    # ou podemos fazer a busca aqui
    return await get_current_user_from_db(db, token)

def require_role(*roles):
    async def _check(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Sem permissão")
        return user
    return _check

require_admin = require_role("admin")
require_staff = require_role("admin", "employee")

async def get_user_by_email(email: str):
    docs = db.collection("users").where(filter=FieldFilter("email", "==", email)).limit(1).stream()
    async for doc in docs:
        return doc
    return None

async def create_notification(db, kind: str, reservation_id: str, extra: dict = None):
    try:
        reserva_ref = await db.collection("reservations").document(reservation_id).get()
        if not reserva_ref.exists:
            return
        reserva = reserva_ref.to_dict()
        
        phone, name = "", ""
        try:
            cust_ref = await db.collection("customers").document(reserva["customer_id"]).get()
            if cust_ref.exists:
                cust = cust_ref.to_dict()
                phone = cust.get("whatsapp") or cust.get("telefone") or ""
                name = cust.get("nome", "")
        except Exception:
            pass

        if not name:
            try:
                u_ref = await db.collection("users").document(reserva["customer_id"]).get()
                if u_ref.exists:
                    name = u_ref.to_dict().get("name", "")
            except Exception:
                pass

        toys_names = []
        for tid in reserva.get("toy_ids", []):
            try:
                t_ref = await db.collection("toys").document(tid).get()
                if t_ref.exists:
                    toys_names.append(t_ref.to_dict()["nome"])
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
        
        await db.collection("notifications").add({
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

# ─────────────────────── AUTH ───────────────────────
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Optional[str] = "customer"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    existing = await get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    
    role = "customer"
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": role,
        "token_version": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    _, doc_ref = await db.collection("users").add(doc)
    user_id = doc_ref.id
    
    access = create_access_token(user_id, email, role, 0)
    refresh = create_refresh_token(user_id, 0)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": payload.name, "role": role}

@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user_doc = await get_user_by_email(email)
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
        
    user_data = user_doc.to_dict()
    if not verify_password(payload.password, user_data["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
        
    uid = user_doc.id
    ver = user_data.get("token_version", 0)
    access = create_access_token(uid, email, user_data["role"], ver)
    refresh = create_refresh_token(uid, ver)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user_data["name"], "role": user_data["role"]}

@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ─────────────────────── COMPANY ───────────────────────
@api.get("/company")
async def get_company():
    docs = db.collection("company").limit(1).stream()
    async for doc in docs:
        return clean_doc(doc)
    return {}

@api.put("/company")
async def update_company(payload: dict, user: dict = Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    docs = [d async for d in db.collection("company").limit(1).stream()]
    
    if docs:
        await db.collection("company").document(docs[0].id).set(payload, merge=True)
        updated = await db.collection("company").document(docs[0].id).get()
        return clean_doc(updated)
    else:
        _, doc_ref = await db.collection("company").add(payload)
        updated = await doc_ref.get()
        return clean_doc(updated)

# ─────────────────────── CUSTOMERS ───────────────────────
@api.post("/customers")
async def create_customer(payload: dict, user: dict = Depends(require_staff)):
    payload["created_at"] = datetime.now(timezone.utc).isoformat()
    payload["deleted"] = False
    _, doc_ref = await db.collection("customers").add(payload)
    doc = await doc_ref.get()
    return clean_doc(doc)

@api.get("/customers")
async def list_customers(q: Optional[str] = None, user: dict = Depends(require_staff)):
    query = db.collection("customers").where(filter=FieldFilter("deleted", "!=", True))
    docs = query.stream()
    
    results = []
    async for d in docs:
        data = clean_doc(d)
        if q:
            # Firestore não tem índice de texto nativo com $or. Filtro aplicado em memória para pequenos volumes.
            q_lower = q.lower()
            if not any(q_lower in str(data.get(k, "")).lower() for k in ["nome", "cpf_cnpj", "telefone", "whatsapp", "email"]):
                continue
        results.append(data)
        
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results[:500]

@api.get("/customers/{cid}")
async def get_customer(cid: str, user: dict = Depends(require_staff)):
    doc = await db.collection("customers").document(cid).get()
    if not doc.exists:
        raise HTTPException(404, "Cliente não encontrado")
    return clean_doc(doc)

@api.put("/customers/{cid}")
async def update_customer(cid: str, payload: dict, user: dict = Depends(require_staff)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    ref = db.collection("customers").document(cid)
    await ref.update(payload)
    return clean_doc(await ref.get())

@api.delete("/customers/{cid}")
async def delete_customer(cid: str, user: dict = Depends(require_admin)):
    await db.collection("customers").document(cid).update({"deleted": True})
    return {"ok": True}

# ─────────────────────── TOYS ───────────────────────
@api.post("/toys")
async def create_toy(payload: dict, user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    payload.update({"created_at": now, "updated_at": now, "deleted": False})
    _, doc_ref = await db.collection("toys").add(payload)
    return clean_doc(await doc_ref.get())

@api.get("/toys")
async def list_toys(public: bool = False):
    query = db.collection("toys").where(filter=FieldFilter("deleted", "!=", True))
    if public:
        query = query.where(filter=FieldFilter("status", "==", "ativo"))
        
    results = [clean_doc(d) async for d in query.stream()]
    results.sort(key=lambda x: x.get("nome", ""))
    return results

@api.get("/toys/{tid}")
async def get_toy(tid: str):
    doc = await db.collection("toys").document(tid).get()
    if not doc.exists:
        raise HTTPException(404, "Brinquedo não encontrado")
    return clean_doc(doc)

@api.put("/toys/{tid}")
async def update_toy(tid: str, payload: dict, user: dict = Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    ref = db.collection("toys").document(tid)
    await ref.update(payload)
    return clean_doc(await ref.get())

@api.delete("/toys/{tid}")
async def delete_toy(tid: str, user: dict = Depends(require_admin)):
    await db.collection("toys").document(tid).update({"deleted": True})
    return {"ok": True}

# ─────────────────────── AVAILABILITY ───────────────────────
async def _check_conflict(toy_id: str, start_iso: str, end_iso: str, exclude_res: Optional[str] = None) -> bool:
    # Firestore array_contains
    query = db.collection("reservations").where(filter=FieldFilter("toy_ids", "array_contains", toy_id))
    
    async for r in query.stream():
        data = r.to_dict()
        if data.get("status") in ["pre_reservada", "confirmada", "em_utilizacao"]:
            if exclude_res and r.id == exclude_res:
                continue
            # Verifica intersecção de datas em memória (Firestore limita range filters a um único campo)
            if data["start_datetime"] < end_iso and data["end_datetime"] > start_iso:
                return True
    return False

@api.get("/availability")
async def check_availability(toy_id: str, start: str, end: str):
    conflict = await _check_conflict(toy_id, start, end)
    return {"available": not conflict}

# ─────────────────────── RESERVATIONS ───────────────────────
class ReservationIn(BaseModel):
    customer_id: str
    toy_ids: List[str]
    start_datetime: str
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
    
    _, doc_ref = await db.collection("reservations").add(doc)
    await create_notification(db, "new_reservation", doc_ref.id)
    return clean_doc(await doc_ref.get())

@api.get("/reservations")
async def list_reservations(
    start: Optional[str] = None,
    end: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = db.collection("reservations")
    
    if user["role"] == "customer":
        query = query.where(filter=FieldFilter("customer_id", "==", user["id"]))
    elif customer_id:
        query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        
    results = [clean_doc(d) async for d in query.stream()]
    
    # Filtro de datas em memória para evitar complexidade de composite index
    if start and end:
        results = [r for r in results if r["start_datetime"] < end and r["end_datetime"] > start]
        
    results.sort(key=lambda x: x.get("start_datetime", ""), reverse=True)
    return results

@api.get("/reservations/{rid}")
async def get_reservation(rid: str, user: dict = Depends(get_current_user)):
    doc = await db.collection("reservations").document(rid).get()
    if not doc.exists:
        raise HTTPException(404, "Reserva não encontrada")
        
    data = doc.to_dict()
    if user["role"] == "customer" and data.get("customer_id") != user["id"]:
        raise HTTPException(403, "Sem permissão")
    return clean_doc(doc)

@api.put("/reservations/{rid}")
async def update_reservation(rid: str, payload: dict, user: dict = Depends(require_staff)):
    ref = db.collection("reservations").document(rid)
    current = await ref.get()
    
    if any(k in payload for k in ["toy_ids", "start_datetime", "end_datetime"]):
        data = current.to_dict()
        toys = payload.get("toy_ids", data["toy_ids"])
        s = payload.get("start_datetime", data["start_datetime"])
        e = payload.get("end_datetime", data["end_datetime"])
        
        for tid in toys:
            if await _check_conflict(tid, s, e, exclude_res=rid):
                raise HTTPException(409, "Conflito de horário")
                
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await ref.update(payload)
    return clean_doc(await ref.get())

@api.delete("/reservations/{rid}")
async def cancel_reservation(rid: str, user: dict = Depends(require_staff)):
    await db.collection("reservations").document(rid).update({
        "status": "cancelada", 
        "cancelled_at": datetime.now(timezone.utc).isoformat()
    })
    return {"ok": True}

# ─────────────────────── QUOTES ───────────────────────
@api.post("/quotes")
async def create_quote(payload: dict, user: dict = Depends(require_staff)):
    now = datetime.now(timezone.utc)
    payload["created_at"] = now.isoformat()
    payload["numero"] = f"Q{int(now.timestamp())}"
    payload["validade"] = (now + timedelta(days=7)).isoformat()
    payload.setdefault("status", "rascunho")
    
    _, doc_ref = await db.collection("quotes").add(payload)
    return clean_doc(await doc_ref.get())

@api.get("/quotes")
async def list_quotes(user: dict = Depends(require_staff)):
    results = [clean_doc(d) async for d in db.collection("quotes").stream()]
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results

@api.post("/quotes/{qid}/convert")
async def convert_quote(qid: str, user: dict = Depends(require_staff)):
    q_ref = db.collection("quotes").document(qid)
    q_doc = await q_ref.get()
    if not q_doc.exists:
        raise HTTPException(404, "Orçamento não encontrado")
        
    q = q_doc.to_dict()
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
    _, res_ref = await db.collection("reservations").add(reserva)
    await q_ref.update({"status": "convertido"})
    return clean_doc(await res_ref.get())

# ─────────────────────── DASHBOARD ───────────────────────
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(require_staff)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    tomorrow = (now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    week_end = (now + timedelta(days=7)).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    res_today, res_week, res_month = 0, 0, 0
    next_event = None
    toy_counts = {}

    reservations = db.collection("reservations").where(filter=FieldFilter("status", "!=", "cancelada"))
    async for r_doc in reservations.stream():
        r = r_doc.to_dict()
        start_dt = r.get("start_datetime", "")
        
        if today <= start_dt < tomorrow: res_today += 1
        if today <= start_dt <= week_end: res_week += 1
        if start_dt >= month_start: res_month += 1
        
        if start_dt >= now.isoformat():
            if not next_event or start_dt < next_event.get("start_datetime"):
                next_event = r
                next_event["id"] = r_doc.id

        for tid in r.get("toy_ids", []):
            toy_counts[tid] = toy_counts.get(tid, 0) + 1

    toys_total = len([t async for t in db.collection("toys")
                     .where(filter=FieldFilter("deleted", "!=", True))
                     .where(filter=FieldFilter("status", "==", "ativo")).stream()])

    revenue = 0
    async for e in db.collection("financial_entries").where(filter=FieldFilter("tipo", "==", "entrada")).stream():
        data = e.to_dict()
        if data.get("data", "") >= month_start:
            revenue += data.get("valor", 0)

    pending = 0
    async for p in db.collection("payments").where(filter=FieldFilter("status", "==", "pending")).stream():
        pending += p.to_dict().get("amount", 0)

    # Top toys
    sorted_toys = sorted(toy_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top = []
    for tid, count in sorted_toys:
        try:
            t_doc = await db.collection("toys").document(tid).get()
            if t_doc.exists:
                top.append({"nome": t_doc.to_dict()["nome"], "count": count})
        except Exception:
            pass

    return {
        "reservas_hoje": res_today,
        "reservas_semana": res_week,
        "reservas_mes": res_month,
        "brinquedos_ativos": toys_total,
        "faturamento_mes": revenue,
        "pagamentos_pendentes": pending,
        "proximo_evento": next_event,
        "top_brinquedos": top,
        "faturamento_por_mes": [], # Simplificado para Firestore
    }

# STARTUP
@app.on_event("startup")
async def startup():
    logger.info("Lany Infláveis API started - Firestore Connected")

app.include_router(api)

# CORS
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
origins = [frontend_url]
extra = os.environ.get("CORS_ORIGINS", "").split(",")
for o in extra:
    o = o.strip()
    if o and o not in origins and o != "*":
        origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)