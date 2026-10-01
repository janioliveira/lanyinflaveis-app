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

## 🚀 Deploy no Vercel (100% compatível)

O projeto está pré-configurado para rodar em um único deployment Vercel: frontend React + backend FastAPI serverless + roteamento SPA.

### Pré-requisitos
- Conta Vercel (gratuita serve para começar)
- MongoDB **hospedado** — recomendo **MongoDB Atlas** gratuito (free tier M0). Vercel é serverless e **não pode rodar MongoDB localmente**.

### Passo a passo

**1. Crie o cluster MongoDB Atlas**
- Acesse https://cloud.mongodb.com → "Build a Database" → M0 Free → escolha região próxima
- Em "Network Access" → "Add IP Address" → `0.0.0.0/0` (permite acesso serverless)
- Em "Database Access" → crie um usuário com senha forte
- Em "Connect" → "Drivers" → copie a connection string (algo como `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net`)

**2. Faça push do código para o GitHub**
Use o botão **"Save to GitHub"** no topo do Emergent, OU manualmente:
```bash
git init
git add .
git commit -m "Lany Infláveis — initial"
git remote add origin https://github.com/seu-usuario/lany-inflaveis.git
git push -u origin main
```

**3. Importe no Vercel**
- https://vercel.com/new → selecione o repositório
- **Framework Preset:** `Other` (deixa o `vercel.json` cuidar do build)
- **Build Command:** já configurado via `vercel.json` (não precisa mexer)
- Antes de clicar "Deploy", vá em **"Environment Variables"** e adicione:

| Nome | Valor | Observação |
|---|---|---|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster...` | string do Atlas |
| `DB_NAME` | `lany_inflaveis` | nome do banco |
| `JWT_SECRET` | gere com `openssl rand -hex 32` | **nunca compartilhe** |
| `ADMIN_EMAIL` | `admin@lanyinflaveis.com` | credencial inicial |
| `ADMIN_PASSWORD` | senha forte | **mude antes de usar!** |
| `FRONTEND_URL` | `https://seu-app.vercel.app` | URL do seu deployment |
| `CORS_ORIGINS` | `https://seu-app.vercel.app` | mesmo valor acima |
| `EMAIL_FROM_NAME` | `Lany Infláveis` | opcional |

- Clique **"Deploy"**

**4. Primeiro acesso**
- Aguarde o build (~2min)
- Acesse `https://seu-app.vercel.app`
- Login admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` do passo 3
- Os brinquedos demo e a empresa Lany Infláveis são criados automaticamente na primeira requisição

### Arquitetura no Vercel
- **`vercel.json`** — build do frontend + roteamento `/api/*` → função Python + fallback SPA
- **`/api/index.py`** — adaptador ASGI que carrega o FastAPI (`backend/server.py`)
- **`/requirements.txt`** — dependências Python mínimas para serverless (sem pandas/numpy/pytest)
- **Frontend** com `REACT_APP_BACKEND_URL=""` → chamadas vão para `/api/...` no mesmo domínio (zero CORS)
- **Seed idempotente** via middleware (não depende de startup contínuo)

### Limitações do plano Hobby (grátis)
- Cold start de ~1-2s na primeira requisição após inatividade
- Função serverless tem timeout de 10s (basta para esta app)
- 100GB de banda/mês

Para alto volume, atualize para **Vercel Pro** (US$20/mês) — timeout 60s + mais invocações.

---

## 🐳 Deploy alternativo (VPS / Docker)


## 📜 Licença

Uso interno da Lany Infláveis. Todos os direitos reservados.

1. Provisione MongoDB (Atlas ou self-hosted).
2. Defina todas as variáveis em `backend/.env`.
3. Build do frontend: `cd frontend && yarn build`.
4. Rode o backend com Uvicorn: `uvicorn server:app --host 0.0.0.0 --port 8001`.
5. Sirva `frontend/build/` com Nginx apontando `/api/*` para o backend.
6. Configure HTTPS em ambos (cookies usam `SameSite=none; Secure`).
