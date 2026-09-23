import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Users() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" });

  async function load() { const { data } = await api.get("/users"); setItems(data); }
  useEffect(() => { load(); }, []);

  async function save() {
    try { await api.post("/users", form); toast.success("Usuário criado."); setOpen(false); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function remove(id) {
    if (!confirm("Excluir?")) return;
    try { await api.delete(`/users/${id}`); load(); } catch(e){ toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl text-[#004E98]">Usuários</h1><p className="text-slate-500 text-sm">Gerenciar acessos.</p></div>
        <Button data-testid="user-new" onClick={() => setOpen(true)} className="rounded-full bg-orange-500 hover:bg-orange-600 gap-2"><Plus className="w-4 h-4" />Novo</Button>
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">Nome</th><th className="text-left p-4">E-mail</th><th className="text-left p-4">Papel</th><th></th></tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-t"><td className="p-4 font-semibold">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4"><span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">{u.role}</span></td><td className="p-4 text-right"><Button size="sm" variant="ghost" onClick={() => remove(u.id)} className="text-red-600">Excluir</Button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input data-testid="user-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>E-mail</Label><Input data-testid="user-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>Senha</Label><Input data-testid="user-password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            <div><Label>Papel</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="employee">Funcionário</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
              </Select>
            </div>
            <Button data-testid="user-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
