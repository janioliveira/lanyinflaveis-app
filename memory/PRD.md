# Lany Infláveis - PRD

## Problem Statement
Sistema web completo, responsivo e profissional para gerenciamento da empresa de locação de brinquedos infláveis **Lany Infláveis** (@lanyinflaveis).

## User Personas
- **Administrador/Proprietário**: acesso completo (dashboard, financeiro, usuários, configurações).
- **Funcionário**: acesso a operação (agenda, reservas, clientes, brinquedos, contratos, notificações).
- **Cliente**: portal próprio (reservas, contratos, pagamentos, WhatsApp).

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + Recharts + Framer Motion
- Backend: FastAPI + Motor (MongoDB) + JWT (bcrypt, PyJWT) + Pydantic
- Auth: httpOnly cookies (SameSite=none, Secure) + Bearer fallback
- Design: Fredoka One (heading) + Nunito (body), paleta laranja/rosa/azul

## Implemented (Feb 2026)
### MVP Core
- Auth JWT com 3 roles (admin/employee/customer) + RBAC nas rotas
- Empresa Lany Infláveis + 3 brinquedos demo + template de contrato seedados
- CRUD Brinquedos (galeria, dimensões, valores, status, soft-delete)
- CRUD Clientes com busca por nome/CPF/telefone
- Reservas com **controle de disponibilidade** (409 em conflito)
- Agenda com calendário mensal + eventos por dia
- Orçamentos com auto-cálculo e conversão para reserva
- Contratos automáticos com placeholders substituídos + aceite digital (nome, CPF, IP, timestamp, hash)
- Pagamentos PIX (QR code mock + copia-e-cola) e Cartão (mock) + webhook `/api/webhooks/payment`
- Dashboard com 6 KPIs + gráficos (faturamento 6M, top brinquedos)
- Financeiro (entradas/saídas com totais e categorização)
- Portal do cliente (reservas, pagamento, assinatura de contrato)
- Site público (hero + catálogo + página do brinquedo com "verificar disponibilidade")
- Usuários (admin cria funcionários)
- Configurações da empresa + editor do modelo de contrato

### WhatsApp Integration (Feb 2026)
- Botão flutuante wa.me em site público, catálogo e portal do cliente (usa número da empresa)
- Central de Notificações no admin com mensagens automáticas prontas
- Templates automáticos: **nova reserva**, **pagamento confirmado**, **lembrete 24h antes**
- Endpoint `POST /api/notifications/reminders/generate` para gerar lembretes de eventos amanhã
- Arquitetura preparada para plugar Twilio/Z-API/Evolution definindo `WHATSAPP_PROVIDER` em .env

## Backlog (P1/P2)
- Exportar relatórios em PDF/Excel
- Upload de múltiplas fotos por brinquedo (object storage)
- Integração real de gateway (Mercado Pago/Asaas) — substituir mock
- Assinatura digital via ZapSign/Clicksign
- Cron scheduler para lembretes (24h antes) automáticos sem clique
- Emissão de nota fiscal (NF-e/NFS-e)
- Login social (Google) opcional
- Notificações push in-app com badge de contagem

## Credentials
Ver `/app/memory/test_credentials.md`
