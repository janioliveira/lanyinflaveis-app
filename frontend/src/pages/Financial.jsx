import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Financial() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "entrada", categoria: "", valor: 0, descricao: "", data: new Date().toISOString() });

  async function load() { const { data } = await api.get("/financial"); setItems(data); }
  useEffect(() => { load(); }, []);

  const totalIn = items.filter(i => i.tipo === "entrada").reduce((s, i) => s + (i.valor || 0), 0);
  const totalOut = items.filter(i => i.tipo === "saida").reduce((s, i) => s + (i.valor || 0), 0);

  async function save() {
    try { await api.post("/financial", form); toast.success("Registrado."); setOpen(false); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl text-[#004E98]">Financeiro</h1><p className="text-slate-500 text-sm">Entradas e saídas.</p></div>
        <Button data-testid="fin-new" onClick={() => setOpen(true)} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><Plus className="w-4 h-4" />Novo lançamento</Button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card label="Entradas" value={totalIn} color="green" />
        <Card label="Saídas" value={totalOut} color="red" />
        <Card label="Saldo" value={totalIn - totalOut} color="blue" />
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">Data</th><th className="text-left p-4">Tipo</th><th className="text-left p-4">Categoria</th><th className="text-left p-4">Descrição</th><th className="text-right p-4">Valor</th></tr></thead>
          <tbody>
            {items.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-4">{new Date(e.data).toLocaleDateString("pt-BR")}</td>
                <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${e.tipo === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{e.tipo}</span></td>
                <td className="p-4">{e.categoria}</td>
                <td className="p-4">{e.descricao}</td>
                <td className="p-4 text-right font-semibold">R$ {e.valor?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Novo lançamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} /></div>
            <div><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: +e.target.value})} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
            <Button data-testid="fin-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ label, value, color }) {
  const cls = { green: "text-green-600", red: "text-red-600", blue: "text-blue-600" }[color];
  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="text-xs text-slate-500 uppercase font-bold">{label}</div>
      <div className={`font-heading text-3xl mt-1 ${cls}`}>R$ {value.toFixed(2)}</div>
    </div>
  );
}
