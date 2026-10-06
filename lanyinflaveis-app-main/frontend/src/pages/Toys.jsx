import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

const empty = { nome: "", categoria: "Inflável", descricao: "", fotos: [""], comprimento: 0, largura: 0, altura: 0, peso: 0, capacidade: 0, faixa_etaria: "", valor_diaria: 0, valor_promocional: 0, caucao: 0, tempo_montagem: 0, tempo_desmontagem: 0, necessita_energia: false, potencia: "", quantidade: 1, estado: "Excelente", status: "ativo", observacoes: "" };

export default function Toys() {
  const [toys, setToys] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  async function load() { const { data } = await api.get("/toys"); setToys(data); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(t) { setEditing(t); setForm({ ...empty, ...t }); setOpen(true); }

  async function save() {
    try {
      const payload = { ...form, fotos: form.fotos.filter(Boolean) };
      if (editing) await api.put(`/toys/${editing.id}`, payload); else await api.post("/toys", payload);
      toast.success("Salvo!"); setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function remove(id) {
    if (!confirm("Excluir este brinquedo?")) return;
    await api.delete(`/toys/${id}`); toast.success("Excluído."); load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-[#004E98] tracking-tight">Brinquedos</h1>
          <p className="text-slate-500 text-sm">Catálogo de equipamentos disponíveis.</p>
        </div>
        <Button data-testid="toy-new" onClick={openNew} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><Plus className="w-4 h-4" />Novo brinquedo</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {toys.map(t => (
          <div key={t.id} data-testid={`toy-item-${t.id}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-elev hover:shadow-lg">
            <div className="aspect-video bg-slate-100">{t.fotos?.[0] ? <img src={t.fotos[0]} alt={t.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Package className="w-12 h-12" /></div>}</div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-pink-600 uppercase">{t.categoria}</div>
                  <div className="font-heading text-lg text-[#004E98]">{t.nome}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${t.status === "ativo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{t.status}</span>
              </div>
              <div className="text-sm text-slate-500 mt-2">R$ {t.valor_diaria?.toFixed(2)} / dia · Qtd: {t.quantidade}</div>
              <div className="flex gap-2 mt-3">
                <Button data-testid={`toy-edit-${t.id}`} size="sm" variant="outline" onClick={() => openEdit(t)} className="rounded-full gap-1"><Pencil className="w-3 h-3" />Editar</Button>
                <Button data-testid={`toy-del-${t.id}`} size="sm" variant="outline" onClick={() => remove(t.id)} className="rounded-full text-red-600 gap-1"><Trash2 className="w-3 h-3" />Excluir</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">{editing ? "Editar" : "Novo"} brinquedo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" full><Input data-testid="toy-form-nome" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></Field>
            <Field label="Categoria"><Input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem><SelectItem value="manutencao">Manutenção</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" full><Textarea rows={2} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></Field>
            <Field label="URL da foto" full><Input value={form.fotos[0] || ""} onChange={e => setForm({...form, fotos: [e.target.value]})} placeholder="https://..." /></Field>
            <Field label="Comp. (m)"><Input type="number" step="0.1" value={form.comprimento} onChange={e => setForm({...form, comprimento: +e.target.value})} /></Field>
            <Field label="Larg. (m)"><Input type="number" step="0.1" value={form.largura} onChange={e => setForm({...form, largura: +e.target.value})} /></Field>
            <Field label="Altura (m)"><Input type="number" step="0.1" value={form.altura} onChange={e => setForm({...form, altura: +e.target.value})} /></Field>
            <Field label="Capacidade"><Input type="number" value={form.capacidade} onChange={e => setForm({...form, capacidade: +e.target.value})} /></Field>
            <Field label="Faixa etária"><Input value={form.faixa_etaria} onChange={e => setForm({...form, faixa_etaria: e.target.value})} /></Field>
            <Field label="Valor diária"><Input type="number" step="0.01" value={form.valor_diaria} onChange={e => setForm({...form, valor_diaria: +e.target.value})} /></Field>
            <Field label="Valor promocional"><Input type="number" step="0.01" value={form.valor_promocional} onChange={e => setForm({...form, valor_promocional: +e.target.value})} /></Field>
            <Field label="Caução"><Input type="number" step="0.01" value={form.caucao} onChange={e => setForm({...form, caucao: +e.target.value})} /></Field>
            <Field label="Quantidade"><Input type="number" value={form.quantidade} onChange={e => setForm({...form, quantidade: +e.target.value})} /></Field>
            <Field label="Estado"><Input value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} /></Field>
          </div>
          <Button data-testid="toy-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full mt-4">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, full, children }) {
  return <div className={full ? "col-span-2" : ""}><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}
