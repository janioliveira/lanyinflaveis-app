"""WhatsApp integration abstraction. Currently uses wa.me links (manual send)
with an abstraction layer ready to plug Twilio/Z-API/Evolution API later.

To enable real automatic sending, set WHATSAPP_PROVIDER=twilio (or zapi/evolution)
in .env and implement the send_* helpers.
"""
import os
import re
from urllib.parse import quote


def normalize_phone(phone: str) -> str:
    """Strip everything except digits. Ensures BR country code 55 when missing."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return ""
    if not digits.startswith("55") and len(digits) in (10, 11):
        digits = "55" + digits
    return digits


def build_wa_link(phone: str, message: str) -> str:
    p = normalize_phone(phone)
    if not p:
        return ""
    return f"https://wa.me/{p}?text={quote(message)}"


def render_message(template: str, ctx: dict) -> str:
    out = template
    for k, v in ctx.items():
        out = out.replace("{" + k + "}", str(v))
    return out


TEMPLATES = {
    "new_reservation": (
        "Olá {NOME}! 🎉\n\n"
        "Sua reserva #{NUMERO} na Lany Infláveis foi registrada:\n"
        "📅 {DATA_EVENTO}\n"
        "🎪 {BRINQUEDOS}\n"
        "💰 Valor: R$ {VALOR}\n\n"
        "Acesse seu portal para efetuar o pagamento e assinar o contrato: {LINK}"
    ),
    "payment_confirmed": (
        "Olá {NOME}! ✅\n\n"
        "Recebemos seu pagamento de R$ {VALOR} para a reserva #{NUMERO}.\n"
        "Sua reserva está confirmada para {DATA_EVENTO}.\n\n"
        "Nos vemos em breve! 🎈"
    ),
    "event_reminder": (
        "Olá {NOME}! 🎊\n\n"
        "Passando para lembrar que seu evento é amanhã ({DATA_EVENTO}) às {HORARIO}.\n"
        "🎪 {BRINQUEDOS}\n"
        "📍 {LOCAL}\n\n"
        "Qualquer dúvida, é só chamar!"
    ),
    "contract_pending": (
        "Olá {NOME}! 📄\n\n"
        "Seu contrato da reserva #{NUMERO} ainda aguarda assinatura.\n"
        "Acesse seu portal para assinar: {LINK}"
    ),
}


def get_provider() -> str:
    return (os.environ.get("WHATSAPP_PROVIDER") or "manual").lower()


async def dispatch(phone: str, message: str) -> dict:
    """Try to send automatically if a real provider is configured.
    Otherwise returns wa.me link for manual sending.
    """
    provider = get_provider()
    link = build_wa_link(phone, message)
    if provider == "manual" or not phone:
        return {"provider": "manual", "status": "pending", "wa_link": link}
    # Placeholder for future providers:
    # if provider == "twilio":  ...
    # if provider == "zapi":    ...
    return {"provider": provider, "status": "pending", "wa_link": link}
