import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { printQuote } from "@/lib/printPdf";

const empty = { customer_id: "", toy_ids: [], start_datetime: "", end_datetime: "", endereco_evento: "", valor_brinquedos: 0, servicos_adicionais: 0, taxa_deslocamento: 0, desconto: 0, valor_total: 0, status: "rascunho", observacoes: "" };

export default function Quotes() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [toys, setToys] = useState([]);
  const [company, setCompany] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  async function load() {
    const [q, c, t, co] = await Promise.all([api.get("/quotes"), api.get("/customers"), api.get("/toys"), api.get("/company")]);
    setItems(q.data); setCustomers(c.data); setToys(t.data); setCompany(co.data || {});
  }
  useEffect(() => { load(); }, []);

  function toggleToy(id) {
    const toys2 = form.toy_ids.includes(id) ? form.toy_ids.filter(x => x !== id) : [...form.toy_ids, id];
    const val = toys.filter(t => toys2.includes(t.id)).reduce((s, t) => s + (t.valor_promocional || t.valor_diaria || 0), 0);
    const total = val + (+form.servicos_adicionais || 0) + (+form.taxa_deslocamento || 0) - (+form.desconto || 0);
    setForm({ ...form, toy_ids: toys2, valor_brinquedos: val, valor_total: total });
  }

  async function save() {
    try { await api.post("/quotes", form); toast.success("Orçamento criado."); setOpen(false); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function convert(id) {
    try { await api.post(`/quotes/${id}/convert`); toast.success("Convertido em reserva!"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl text-[#004E98]">Orçamentos</h1><p className="text-slate-500 text-sm">Criar e converter propostas.</p></div>
        <Button data-testid="q-new" onClick={() => { setForm(empty); setOpen(true); }} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><Plus className="w-4 h-4" />Novo</Button>
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">Nº</th><th className="text-left p-4">Cliente</th><th className="text-left p-4">Valor</th><th className="text-left p-4">Status</th><th></th></tr></thead>
          <tbody>
            {items.map(q => {
              const c = customers.find(x => x.id === q.customer_id);
              return (
                <tr key={q.id} className="border-t">
                  <td className="p-4 font-mono text-xs">{q.numero}</td>
                  <td className="p-4 font-semibold">{c?.nome}</td>
                  <td className="p-4">R$ {q.valor_total?.toFixed(2)}</td>
                  <td className="p-4"><span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700 font-semibold">{q.status}</span></td>
                  <td className="p-4 text-right space-x-1">
                    <Button data-testid={`q-pdf-${q.id}`} size="sm" variant="outline" onClick={() => printQuote({ quote: q, customer: customers.find(x => x.id === q.customer_id), toys, company })} className="rounded-full gap-1"><FileDown className="w-3 h-3" />PDF</Button>
                    {q.status !== "convertido" && <Button data-testid={`q-conv-${q.id}`} size="sm" onClick={() => convert(q.id)} className="rounded-full bg-orange-500 hover:bg-orange-600">Converter</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Novo orçamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cliente</Label>
              <Select value={form.customer_id} onValueChange={v => setForm({...form, customer_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Brinquedos</Label>
              <div className="flex flex-wrap gap-2 mt-1">{toys.map(t => (
                <button key={t.id} type="button" onClick={() => toggleToy(t.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${form.toy_ids.includes(t.id) ? "bg-orange-500 text-white border-orange-500" : "bg-white border-slate-200 text-slate-600"}`}>{t.nome}</button>
              ))}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="datetime-local" value={form.start_datetime} onChange={e => setForm({...form, start_datetime: e.target.value})} /></div>
              <div><Label>Fim</Label><Input type="datetime-local" value={form.end_datetime} onChange={e => setForm({...form, end_datetime: e.target.value})} /></div>
            </div>
            <Textarea rows={2} placeholder="Endereço" value={form.endereco_evento} onChange={e => setForm({...form, endereco_evento: e.target.value})} />
            <div className="bg-orange-50 rounded-xl p-4 flex justify-between"><span>Total</span><span className="font-heading text-2xl text-orange-500">R$ {form.valor_total.toFixed(2)}</span></div>
            <Button data-testid="q-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
