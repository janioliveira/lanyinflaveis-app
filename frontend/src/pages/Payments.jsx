import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Payments() {
  const [items, setItems] = useState([]);
  async function load() { const { data } = await api.get("/payments"); setItems(data); }
  useEffect(() => { load(); }, []);

  async function confirm(id) {
    try { await api.post(`/payments/${id}/simulate-confirm`); toast.success("Pagamento confirmado (simulado)."); load(); }
    catch (e) { toast.error("Erro"); }
  }
  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-3xl text-[#004E98]">Pagamentos</h1><p className="text-slate-500 text-sm">Transações e status.</p></div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">TX</th><th className="text-left p-4">Método</th><th className="text-left p-4">Valor</th><th className="text-left p-4">Status</th><th className="text-left p-4">Reserva</th><th></th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-4 font-mono text-xs">{p.transaction_id}</td>
                <td className="p-4 uppercase">{p.method}</td>
                <td className="p-4">R$ {p.amount?.toFixed(2)}</td>
                <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{p.status}</span></td>
                <td className="p-4 font-mono text-xs">{p.reservation_id}</td>
                <td className="p-4 text-right">{p.status === "pending" && <Button data-testid={`pay-confirm-${p.id}`} size="sm" onClick={() => confirm(p.id)} className="rounded-full bg-orange-500 hover:bg-orange-600">Confirmar (Mock)</Button>}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sem pagamentos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
