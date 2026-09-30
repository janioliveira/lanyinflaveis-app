# 🎈 Lany Infláveis — Sistema de Gestão

Aplicação web completa para gestão da empresa **Lany Infláveis** ([@lanyinflaveis](https://instagram.com/lanyinflaveis)) — locação de brinquedos infláveis e equipamentos para festas infantis.

## ✨ Funcionalidades

- **Autenticação JWT** com 3 papéis: Administrador, Funcionário, Cliente (RBAC)
- **Site público** com hero + catálogo de brinquedos
- **Portal do cliente** para reservar, pagar, visualizar e assinar contratos
- **Dashboard admin** com KPIs e gráficos (faturamento, brinquedos mais alugados)
- **Agenda** com calendário mensal e eventos por dia
- **Reservas** com controle automático de disponibilidade (impede dupla reserva)
- **Orçamentos** com auto-cálculo e conversão em reserva
- **Contratos automáticos** com placeholders substituídos + aceite digital (nome, CPF, IP, timestamp, hash)
- **Pagamentos** PIX (QR code + copia-e-cola) e cartão (mock) + webhook `/api/webhooks/payment`
- **Financeiro** entradas/saídas com totais e categorização
- **Integração WhatsApp** — botão flutuante + notificações automáticas prontas
- **Exportação em PDF** de orçamentos, contratos e relatório financeiro (via Save-as-PDF do navegador)

## 🛠 Stack

- **Frontend:** React 19, Tailwind CSS, Shadcn UI, Recharts, Framer Motion, Lucide React
- **Backend:** FastAPI, Motor (async MongoDB), PyJWT, bcrypt, Pydantic
- **Design tokens:** Fredoka One (headings) + Nunito (body), paleta laranja/rosa/azul (`#FF6B35 / #FF4785 / #004E98`)

## 📂 Estrutura

```
/app
├── backend/
│   ├── server.py           # FastAPI + todas as rotas /api/*
│   ├── auth.py             # JWT + bcrypt + RBAC helpers
│   ├── seed.py             # Seed inicial (admin, empresa, brinquedos demo, template)
│   ├── whatsapp.py         # Abstração WhatsApp (wa.me + hook para Twilio/Z-API)
│   ├── requirements.txt
│   └── .env                # (ignorado pelo git) MONGO_URL, JWT_SECRET, ADMIN_*
├── frontend/
│   ├── src/
│   │   ├── App.js          # Router (rotas públicas, /portal, /app/*)
│   │   ├── context/AuthContext.jsx
│   │   ├── components/     # AdminLayout, WhatsAppFloat, ui/ (shadcn)
│   │   ├── pages/          # Dashboard, Toys, Reservations, ...
│   │   └── lib/            # api.js, printPdf.js
│   ├── package.json
│   └── .env                # REACT_APP_BACKEND_URL
├── memory/                 # PRD + credenciais de teste
├── design_guidelines.json  # Diretrizes visuais
└── README.md
```

## ⚙️ Configuração

### 1. Variáveis de ambiente

**`backend/.env`** (crie a partir de `backend/.env.example`):
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="lany_inflaveis"
CORS_ORIGINS="https://seu-dominio.com"
FRONTEND_URL="https://seu-dominio.com"
JWT_SECRET="<gere-64-caracteres-aleatórios>"
ADMIN_EMAIL="admin@lanyinflaveis.com"
ADMIN_PASSWORD="Admin@123"
EMAIL_FROM_NAME="Lany Infláveis"

# Opcional — para integração WhatsApp automática (Twilio/Z-API):
# WHATSAPP_PROVIDER="twilio"
# TWILIO_ACCOUNT_SID="..."
# TWILIO_AUTH_TOKEN="..."
# TWILIO_WA_FROM="whatsapp:+14155238886"

# Opcional — quando integrar gateway real:
# PAYMENT_API_KEY="..."
# PAYMENT_WEBHOOK_SECRET="..."
```

**`frontend/.env`**:
```bash
REACT_APP_BACKEND_URL=https://api.seu-dominio.com
```

### 2. Rodar localmente

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (em outro terminal)
cd frontend
yarn install
yarn start
```

### 3. Credenciais iniciais

Ao subir pela primeira vez, o backend cria automaticamente:
- **Admin:** `admin@lanyinflaveis.com` / `Admin@123`
- Empresa **Lany Infláveis** com Instagram @lanyinflaveis
- 3 brinquedos demo (Futebol de Sabão, Cama Elástica 4m, Tobogã Inflável Gigante)
- Template padrão de contrato

Altere `ADMIN_PASSWORD` no `.env` antes do primeiro deploy em produção.

## 🔌 Integrações preparadas

| Serviço | Status | Como plugar |
|---|---|---|
| MongoDB | ✅ Ativo | `MONGO_URL` |
| Autenticação JWT | ✅ Ativo | `JWT_SECRET` |
| PIX / Cartão | 🟡 Mock | Trocar `POST /api/payments` em `server.py` para SDK do Mercado Pago / Asaas / Stripe |
| Webhook pagamento | ✅ Endpoint pronto | `POST /api/webhooks/payment` — validar assinatura em produção |
| WhatsApp | 🟡 wa.me manual | Definir `WHATSAPP_PROVIDER=twilio` em `.env` e implementar `dispatch()` em `whatsapp.py` |
| Assinatura digital | 🟡 Interna | Integrar ZapSign/Clicksign em `POST /api/contracts/{id}/sign` |

## 🧪 Testes

- Backend testado ponta-a-ponta (Auth, RBAC, disponibilidade, orçamentos→reserva, pagamento mock, contratos, webhooks, dashboard).
- Frontend testado (login admin, dashboard KPIs, gráficos, sidebar, portal do cliente).
- Relatórios em `/app/test_reports/iteration_*.json`.

## 🚀 Deploy

1. Provisione MongoDB (Atlas ou self-hosted).
2. Defina todas as variáveis em `backend/.env` — especialmente `JWT_SECRET`, `ADMIN_PASSWORD`, `FRONTEND_URL`, `CORS_ORIGINS`.
3. Deploy do backend em qualquer host que rode Uvicorn (Fly.io, Railway, Render, VPS com supervisor).
4. Build do frontend: `cd frontend && yarn build` → sirva `frontend/build/` em CDN/Vercel/Netlify apontando `REACT_APP_BACKEND_URL` para a API.
5. Configure HTTPS em ambos (obrigatório porque os cookies usam `SameSite=none; Secure`).

## 📜 Licença

Uso interno da Lany Infláveis. Todos os direitos reservados.
