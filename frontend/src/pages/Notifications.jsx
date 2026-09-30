import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Send, RefreshCcw, Bell } from "lucide-react";

const KIND_LABEL = {
  new_reservation: "Nova reserva",
  payment_confirmed: "Pagamento confirmado",
  event_reminder: "Lembrete 24h",
  contract_pending: "Contrato pendente",
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await api.get("/notifications");
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function markSent(id) {
    await api.post(`/notifications/${id}/mark-sent`); load();
  }
  async function genReminders() {
    setLoading(true);
    try {
      const { data } = await api.post("/notifications/reminders/generate");
      toast.success(`${data.created} lembrete(s) gerado(s).`);
      load();
    } catch (e) { toast.error("Erro"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl text-[#004E98] tracking-tight flex items-center gap-2"><Bell className="w-7 h-7" />Notificações WhatsApp</h1>
          <p className="text-slate-500 text-sm">Mensagens automáticas geradas para envio ao cliente.</p>
        </div>
        <Button data-testid="gen-reminders" onClick={genReminders} disabled={loading} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><RefreshCcw className="w-4 h-4" />Gerar lembretes de eventos amanhã</Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
        <b>Como funciona:</b> quando uma reserva é criada ou pagamento é confirmado, o sistema gera automaticamente uma mensagem pronta com o link "Abrir no WhatsApp". Basta clicar para abrir o WhatsApp Web/App com o texto já preenchido e enviar. Para automação total sem clique, plugue um provedor (Twilio/Z-API) definindo <code className="bg-white px-1 rounded">WHATSAPP_PROVIDER</code> nas variáveis de ambiente.
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-slate-400 bg-white p-8 rounded-2xl border text-center">Nenhuma notificação ainda. Crie uma reserva ou confirme um pagamento para gerar.</div>}
        {items.map(n => (
          <div key={n.id} data-testid={`notif-${n.id}`} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700 font-bold uppercase tracking-wide">{KIND_LABEL[n.kind] || n.kind}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${n.status === "sent" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{n.status === "sent" ? "Enviada" : "Pendente"}</span>
                  <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <div className="text-sm font-semibold text-slate-800">{n.customer_name} · <span className="text-slate-500 font-mono">{n.phone || "sem telefone"}</span></div>
                <pre className="mt-2 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl">{n.message}</pre>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {n.wa_link ? (
                  <a data-testid={`open-wa-${n.id}`} href={n.wa_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-green-600 transition-colors">
                    <MessageCircle className="w-4 h-4" />Abrir WhatsApp
                  </a>
                ) : <div className="text-xs text-red-500">Sem telefone</div>}
                {n.status !== "sent" && (
                  <Button data-testid={`mark-sent-${n.id}`} size="sm" variant="outline" onClick={() => markSent(n.id)} className="rounded-full gap-1"><Send className="w-3 h-3" />Marcar como enviada</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
