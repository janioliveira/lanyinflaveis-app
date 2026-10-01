import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

const empty = { nome: "", cpf_cnpj: "", data_nascimento: "", telefone: "", whatsapp: "", email: "", cep: "", estado: "", cidade: "", bairro: "", rua: "", numero: "", complemento: "", ponto_referencia: "", observacoes: "" };

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => { const { data } = await api.get(`/customers${q ? "?q=" + encodeURIComponent(q) : ""}`); setItems(data); }, [q]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form); else await api.post("/customers", form);
      toast.success("Salvo!"); setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function remove(id) {
    if (!confirm("Excluir cliente?")) return;
    await api.delete(`/customers/${id}`); load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl text-[#004E98]">Clientes</h1><p className="text-slate-500 text-sm">Cadastro e histórico.</p></div>
        <Button data-testid="cust-new" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><Plus className="w-4 h-4" />Novo</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <Input data-testid="cust-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, CPF, telefone..." className="pl-10 rounded-full" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="text-left p-4">Nome</th><th className="text-left p-4">CPF/CNPJ</th><th className="text-left p-4">Telefone</th><th className="text-left p-4">E-mail</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-4 font-semibold">{c.nome}</td>
                <td className="p-4">{c.cpf_cnpj}</td>
                <td className="p-4">{c.telefone}</td>
                <td className="p-4">{c.email}</td>
                <td className="p-4 flex gap-1 justify-end">
                  <Button data-testid={`cust-edit-${c.id}`} size="sm" variant="ghost" onClick={() => { setEditing(c); setForm({...empty, ...c}); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button data-testid={`cust-del-${c.id}`} size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cliente cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">{editing ? "Editar" : "Novo"} cliente</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["nome","Nome completo",true],["cpf_cnpj","CPF/CNPJ"],["email","E-mail"],["telefone","Telefone"],["whatsapp","WhatsApp"],["data_nascimento","Nascimento","","date"],
              ["cep","CEP"],["estado","Estado"],["cidade","Cidade"],["bairro","Bairro"],["rua","Rua"],["numero","Número"],["complemento","Complemento",true],["ponto_referencia","Ponto de referência",true],["observacoes","Observações",true],
            ].map(([k, label, full, type]) => (
              <div key={k} className={full ? "col-span-2" : ""}>
                <Label className="text-xs">{label}</Label>
                <Input data-testid={`cust-field-${k}`} type={type || "text"} value={form[k] || ""} onChange={e => setForm({...form, [k]: e.target.value})} className="mt-1" />
              </div>
            ))}
          </div>
          <Button data-testid="cust-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full mt-4">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
