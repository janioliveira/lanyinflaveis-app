import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const statusColor = {
  pre_reservada: "bg-pink-100 text-pink-700",
  confirmada: "bg-blue-100 text-blue-700",
  em_utilizacao: "bg-orange-100 text-orange-700",
  concluida: "bg-green-100 text-green-700",
  cancelada: "bg-slate-100 text-slate-500",
};

export default function Reservations() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [toys, setToys] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", toy_ids: [], start_datetime: "", end_datetime: "", endereco_evento: "", valor_brinquedos: 0, servicos_adicionais: 0, taxa_deslocamento: 0, desconto: 0, valor_total: 0, observacoes: "" });
  const nav = useNavigate();

  async function load() {
    const [r, c, t] = await Promise.all([api.get("/reservations"), api.get("/customers"), api.get("/toys")]);
    setItems(r.data); setCustomers(c.data); setToys(t.data);
  }
  useEffect(() => { load(); }, []);

  function updateTotal(f) {
    const total = (+f.valor_brinquedos || 0) + (+f.servicos_adicionais || 0) + (+f.taxa_deslocamento || 0) - (+f.desconto || 0);
    return { ...f, valor_total: total };
  }
  function toggleToy(id) {
    const toys2 = form.toy_ids.includes(id) ? form.toy_ids.filter(x => x !== id) : [...form.toy_ids, id];
    const val = toys.filter(t => toys2.includes(t.id)).reduce((s, t) => s + (t.valor_promocional || t.valor_diaria || 0), 0);
    setForm(updateTotal({ ...form, toy_ids: toys2, valor_brinquedos: val }));
  }

  async function save() {
    try {
      await api.post("/reservations", form);
      toast.success("Reserva criada!"); setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function generateContract(id) {
    try {
      const { data } = await api.post(`/reservations/${id}/contract`);
      toast.success("Contrato gerado!"); nav(`/app/contratos`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl text-[#004E98]">Reservas</h1><p className="text-slate-500 text-sm">Todas as reservas.</p></div>
        <Button data-testid="rsv-new" onClick={() => setOpen(true)} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><Plus className="w-4 h-4" />Nova reserva</Button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="text-left p-4">Nº</th><th className="text-left p-4">Cliente</th><th className="text-left p-4">Data</th><th className="text-left p-4">Valor</th><th className="text-left p-4">Status</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(r => {
              const c = customers.find(x => x.id === r.customer_id);
              return (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-4 font-mono text-xs">{r.numero}</td>
                  <td className="p-4 font-semibold">{c?.nome || r.customer_id}</td>
                  <td className="p-4">{new Date(r.start_datetime).toLocaleString("pt-BR")}</td>
                  <td className="p-4">R$ {r.valor_total?.toFixed(2)}</td>
                  <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor[r.status] || "bg-slate-100"}`}>{r.status}</span></td>
                  <td className="p-4 text-right">
                    <Button data-testid={`rsv-contract-${r.id}`} size="sm" variant="outline" onClick={() => generateContract(r.id)} className="rounded-full gap-1"><FileText className="w-3 h-3" />Contrato</Button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sem reservas.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Nova reserva</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente</Label>
              <Select value={form.customer_id} onValueChange={v => setForm({...form, customer_id: v})}>
                <SelectTrigger data-testid="rsv-customer"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brinquedos</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {toys.map(t => (
                  <button key={t.id} data-testid={`rsv-toy-${t.id}`} type="button" onClick={() => toggleToy(t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${form.toy_ids.includes(t.id) ? "bg-orange-500 text-white border-orange-500" : "bg-white border-slate-200 text-slate-600"}`}>
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input data-testid="rsv-start" type="datetime-local" value={form.start_datetime} onChange={e => setForm({...form, start_datetime: e.target.value})} /></div>
              <div><Label>Fim</Label><Input data-testid="rsv-end" type="datetime-local" value={form.end_datetime} onChange={e => setForm({...form, end_datetime: e.target.value})} /></div>
            </div>
            <div><Label>Endereço</Label><Textarea rows={2} value={form.endereco_evento} onChange={e => setForm({...form, endereco_evento: e.target.value})} /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs">Brinquedos</Label><Input type="number" step="0.01" value={form.valor_brinquedos} onChange={e => setForm(updateTotal({...form, valor_brinquedos: +e.target.value}))} /></div>
              <div><Label className="text-xs">Adicionais</Label><Input type="number" step="0.01" value={form.servicos_adicionais} onChange={e => setForm(updateTotal({...form, servicos_adicionais: +e.target.value}))} /></div>
              <div><Label className="text-xs">Deslocamento</Label><Input type="number" step="0.01" value={form.taxa_deslocamento} onChange={e => setForm(updateTotal({...form, taxa_deslocamento: +e.target.value}))} /></div>
              <div><Label className="text-xs">Desconto</Label><Input type="number" step="0.01" value={form.desconto} onChange={e => setForm(updateTotal({...form, desconto: +e.target.value}))} /></div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
              <div className="text-sm text-slate-600 font-semibold">Total</div>
              <div className="font-heading text-2xl text-orange-500">R$ {form.valor_total.toFixed(2)}</div>
            </div>
          </div>
          <Button data-testid="rsv-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full mt-4">Criar reserva</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
