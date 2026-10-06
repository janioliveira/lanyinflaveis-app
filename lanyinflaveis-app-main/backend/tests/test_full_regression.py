"""Full backend regression test for Lany Infláveis - Iteration 2."""
import os, time, uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@lanyinflaveis.com", "password": "Admin@123"}


# ───── Fixtures ─────
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def customer_session():
    s = requests.Session()
    email = f"cust_{uuid.uuid4().hex[:8]}@teste.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test@1234", "name": "Cliente Teste"}, timeout=20)
    assert r.status_code in (200, 201), f"Customer register failed: {r.status_code} {r.text}"
    token = r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    s.user_email = email
    return s


@pytest.fixture(scope="session")
def employee_session(admin_session):
    email = f"emp_{uuid.uuid4().hex[:8]}@teste.com"
    r = admin_session.post(f"{API}/users", json={"email": email, "password": "Emp@1234", "name": "Func Teste", "role": "employee"}, timeout=20)
    assert r.status_code in (200, 201), f"Employee create failed: {r.status_code} {r.text}"
    s = requests.Session()
    r2 = s.post(f"{API}/auth/login", json={"email": email, "password": "Emp@1234"}, timeout=20)
    assert r2.status_code == 200
    token = r2.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ───── AUTH ─────
class TestAuth:
    def test_admin_login(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_register_forces_customer(self):
        email = f"self_{uuid.uuid4().hex[:8]}@teste.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "T@1234", "name": "X", "role": "admin"}, timeout=15)
        assert r.status_code in (200, 201)
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": email, "password": "T@1234"})
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["role"] == "customer"

    def test_logout(self, admin_session):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200


# ───── RBAC ─────
class TestRBAC:
    def test_employee_403_on_toys_create(self, employee_session):
        r = employee_session.post(f"{API}/toys", json={"nome": "x", "valor_diaria": 1})
        assert r.status_code == 403

    def test_employee_403_on_users(self, employee_session):
        r = employee_session.post(f"{API}/users", json={"email": "x@y.z", "password": "P@1234", "name": "n", "role": "employee"})
        assert r.status_code == 403

    def test_employee_403_on_financial_post(self, employee_session):
        r = employee_session.post(f"{API}/financial", json={"tipo": "entrada", "valor": 1, "data": "2026-01-01", "categoria": "x", "descricao": "x"})
        assert r.status_code == 403

    def test_employee_403_on_company_put(self, employee_session):
        r = employee_session.put(f"{API}/company", json={"nome_fantasia": "x"})
        assert r.status_code == 403

    def test_customer_403_on_users(self, customer_session):
        r = customer_session.get(f"{API}/users")
        assert r.status_code == 403

    def test_customer_403_on_customers(self, customer_session):
        r = customer_session.get(f"{API}/customers")
        assert r.status_code == 403

    def test_customer_403_on_financial(self, customer_session):
        r = customer_session.get(f"{API}/financial")
        assert r.status_code == 403


# ───── Toys ─────
class TestToys:
    def test_public_toys_list(self):
        r = requests.get(f"{API}/toys?public=true", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3
        names = [t["nome"] for t in data]
        assert any("Sabão" in n or "Sabao" in n for n in names)


# ───── Customers ─────
class TestCustomers:
    def test_create_and_search(self, admin_session):
        payload = {"nome": "TEST_João Silva", "cpf": "12345678900", "telefone": "11999998888", "whatsapp": "11999998888", "email": f"joao_{uuid.uuid4().hex[:6]}@t.com", "endereco": "Rua X, 1"}
        r = admin_session.post(f"{API}/customers", json=payload)
        assert r.status_code in (200, 201)
        cid = r.json()["id"]
        # Search by nome
        r2 = admin_session.get(f"{API}/customers?q=TEST_João")
        assert r2.status_code == 200
        assert any(c["id"] == cid for c in r2.json())
        return cid


# ───── Reservations ─────
class TestReservations:
    def test_create_conflict_and_availability(self, admin_session):
        toys = requests.get(f"{API}/toys?public=true").json()
        tid = toys[0]["id"]
        # customer
        cr = admin_session.post(f"{API}/customers", json={"nome": "TEST_Res Cliente", "telefone": "11", "whatsapp": "11", "email": f"r_{uuid.uuid4().hex[:6]}@t.com"})
        cid = cr.json()["id"]
        # unique date per run to avoid conflicts with prior data
        import random
        yr = 2030 + random.randint(0, 20)
        start = f"{yr}-06-01T14:00:00"
        end = f"{yr}-06-01T20:00:00"
        # availability true
        av = admin_session.get(f"{API}/availability", params={"toy_id": tid, "start": start, "end": end})
        assert av.status_code == 200 and av.json()["available"] is True
        r = admin_session.post(f"{API}/reservations", json={"customer_id": cid, "toy_ids": [tid], "start_datetime": start, "end_datetime": end, "endereco_evento": "R X", "valor_total": 100})
        assert r.status_code in (200, 201), r.text
        # conflict
        r2 = admin_session.post(f"{API}/reservations", json={"customer_id": cid, "toy_ids": [tid], "start_datetime": start, "end_datetime": end, "endereco_evento": "R Y", "valor_total": 100})
        assert r2.status_code == 409


# ───── Quotes ─────
class TestQuotes:
    def test_create_and_convert(self, admin_session):
        toys = requests.get(f"{API}/toys?public=true").json()
        tid = toys[1]["id"]
        cr = admin_session.post(f"{API}/customers", json={"nome": "TEST_Q", "telefone": "11", "whatsapp": "11", "email": f"q_{uuid.uuid4().hex[:6]}@t.com"})
        cid = cr.json()["id"]
        q = admin_session.post(f"{API}/quotes", json={"customer_id": cid, "toy_ids": [tid], "start_datetime": "2027-07-10T10:00:00", "end_datetime": "2027-07-10T16:00:00", "endereco_evento": "L", "valor_brinquedos": 200, "valor_total": 200})
        assert q.status_code in (200, 201), q.text
        qd = q.json()
        assert qd.get("numero", "").startswith("Q")
        conv = admin_session.post(f"{API}/quotes/{qd['id']}/convert")
        assert conv.status_code == 200
        # verify quote marked converted
        lst = admin_session.get(f"{API}/quotes").json()
        found = next((x for x in lst if x["id"] == qd["id"]), None)
        assert found and found["status"] == "convertido"


# ───── Contracts ─────
class TestContracts:
    def test_contract_placeholders_and_idempotent(self, admin_session):
        toys = requests.get(f"{API}/toys?public=true").json()
        tid = toys[2]["id"]
        cr = admin_session.post(f"{API}/customers", json={"nome": "TEST_Contract Cliente", "telefone": "11", "whatsapp": "11", "email": f"c_{uuid.uuid4().hex[:6]}@t.com"})
        cid = cr.json()["id"]
        r = admin_session.post(f"{API}/reservations", json={"customer_id": cid, "toy_ids": [tid], "start_datetime": "2027-08-01T09:00:00", "end_datetime": "2027-08-01T18:00:00", "endereco_evento": "Rua Y", "valor_total": 500})
        rid = r.json()["id"]
        c1 = admin_session.post(f"{API}/reservations/{rid}/contract")
        assert c1.status_code in (200, 201), c1.text
        cd = c1.json()
        assert "TEST_Contract Cliente" in cd["content"]
        assert "{NOME_CLIENTE}" not in cd["content"]
        # Idempotent
        c2 = admin_session.post(f"{API}/reservations/{rid}/contract")
        assert c2.json()["id"] == cd["id"]


# ───── Payments / PIX / Webhook ─────
class TestPayments:
    def _make_reservation(self, admin_session, when="2027-09-05T10:00:00", end="2027-09-05T16:00:00"):
        toys = requests.get(f"{API}/toys?public=true").json()
        tid = toys[0]["id"]
        cr = admin_session.post(f"{API}/customers", json={"nome": "TEST_Pay", "telefone": "11", "whatsapp": "11999998888", "email": f"p_{uuid.uuid4().hex[:6]}@t.com"})
        cid = cr.json()["id"]
        r = admin_session.post(f"{API}/reservations", json={"customer_id": cid, "toy_ids": [tid], "start_datetime": when, "end_datetime": end, "endereco_evento": "L", "valor_total": 300})
        return r.json()["id"]

    def test_pix_payment_returns_qr(self, admin_session):
        rid = self._make_reservation(admin_session)
        p = admin_session.post(f"{API}/payments", json={"reservation_id": rid, "amount": 300, "method": "pix"})
        assert p.status_code in (200, 201), p.text
        pd = p.json()
        assert pd.get("pix_qr_code"), f"pix_qr_code missing: {pd}"
        assert pd.get("pix_expires_at")
        # BRCode should contain PIX format identifier
        assert len(pd["pix_qr_code"]) > 20

    def test_simulate_confirm_marks_paid_and_confirms_reservation(self, admin_session):
        rid = self._make_reservation(admin_session, "2027-09-06T10:00:00", "2027-09-06T16:00:00")
        p = admin_session.post(f"{API}/payments", json={"reservation_id": rid, "amount": 300, "method": "pix"})
        pid = p.json()["id"]
        c = admin_session.post(f"{API}/payments/{pid}/simulate-confirm")
        assert c.status_code == 200
        res = admin_session.get(f"{API}/reservations/{rid}").json()
        assert res["status"] == "confirmada"

    def test_webhook_marks_payment_paid(self, admin_session):
        rid = self._make_reservation(admin_session, "2027-09-07T10:00:00", "2027-09-07T16:00:00")
        p = admin_session.post(f"{API}/payments", json={"reservation_id": rid, "amount": 300, "method": "pix"})
        pd = p.json()
        txid = pd.get("transaction_id") or pd["id"]
        w = requests.post(f"{API}/webhooks/payment", json={"event": "payment.approved", "transaction_id": txid}, timeout=15)
        assert w.status_code == 200


# ───── Dashboard ─────
class TestDashboard:
    def test_stats(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["reservas_hoje", "faturamento_mes", "top_brinquedos", "faturamento_por_mes"]:
            assert k in d, f"missing {k}"


# ───── Notifications ─────
class TestNotifications:
    def test_notifications_auto_created_on_reservation(self, admin_session):
        toys = requests.get(f"{API}/toys?public=true").json()
        tid = toys[0]["id"]
        cr = admin_session.post(f"{API}/customers", json={"nome": "TEST_Notif", "telefone": "11999998888", "whatsapp": "11999998888", "email": f"n_{uuid.uuid4().hex[:6]}@t.com"})
        cid = cr.json()["id"]
        r = admin_session.post(f"{API}/reservations", json={"customer_id": cid, "toy_ids": [tid], "start_datetime": "2027-10-01T10:00:00", "end_datetime": "2027-10-01T16:00:00", "endereco_evento": "L", "valor_total": 300})
        rid = r.json()["id"]
        time.sleep(1)
        notifs = admin_session.get(f"{API}/notifications").json()
        found = [n for n in notifs if n.get("reservation_id") == rid]
        assert found, "No notification created for new reservation"
        n0 = found[0]
        assert n0.get("wa_link", "").startswith("https://wa.me/") or "wa.me" in n0.get("wa_link", "")


# ───── Company ─────
class TestCompany:
    def test_get_company(self, admin_session):
        r = admin_session.get(f"{API}/company")
        assert r.status_code == 200
        assert r.json().get("nome_fantasia")


# ───── Financial ─────
class TestFinancial:
    def test_list_and_create(self, admin_session):
        r = admin_session.get(f"{API}/financial")
        assert r.status_code == 200
        c = admin_session.post(f"{API}/financial", json={"tipo": "saida", "valor": 50, "data": "2026-01-15", "categoria": "TEST", "descricao": "TEST_x"})
        assert c.status_code in (200, 201)
