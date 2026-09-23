import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Company() {
  const [form, setForm] = useState({});
  const [template, setTemplate] = useState({ conteudo: "" });
  const [tOpen, setTOpen] = useState(false);

  async function load() {
    const c = await api.get("/company"); setForm(c.data || {});
    try { const t = await api.get("/contract-templates"); if (t.data[0]) setTemplate(t.data[0]); } catch(_) {}
  }
  useEffect(() => { load(); }, []);

  async function save() {
    try { await api.put("/company", form); toast.success("Salvo!"); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function saveTemplate() {
    try { await api.put("/contract-templates/default", { conteudo: template.conteudo }); toast.success("Modelo atualizado!"); setTOpen(false); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  const fields = [
    ["nome_fantasia","Nome fantasia",true],["razao_social","Razão social",true],["cnpj","CNPJ"],["email","E-mail"],["telefone","Telefone"],["whatsapp","WhatsApp"],
    ["instagram","Instagram"],["cep","CEP"],["estado","Estado"],["cidade","Cidade"],["endereco","Endereço",true],["chave_pix","Chave PIX",true],
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="font-heading text-3xl text-[#004E98]">Empresa</h1><p className="text-slate-500 text-sm">Dados da Lany Infláveis.</p></div>
      <div className="bg-white rounded-2xl border p-6 grid grid-cols-2 gap-3">
        {fields.map(([k, label, full]) => (
          <div key={k} className={full ? "col-span-2" : ""}>
            <Label className="text-xs">{label}</Label>
            <Input data-testid={`co-${k}`} value={form[k] || ""} onChange={e => setForm({...form, [k]: e.target.value})} className="mt-1" />
          </div>
        ))}
        <div className="col-span-2 flex gap-2">
          <Button data-testid="co-save" onClick={save} className="rounded-full bg-orange-500 hover:bg-orange-600">Salvar</Button>
          <Button data-testid="co-template" variant="outline" onClick={() => setTOpen(true)} className="rounded-full">Editar modelo de contrato</Button>
        </div>
      </div>

      <Dialog open={tOpen} onOpenChange={setTOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Modelo de contrato</DialogTitle></DialogHeader>
          <div className="text-xs text-slate-500 mb-2">Use variáveis: {"{NOME_CLIENTE}, {CPF_CLIENTE}, {DATA_EVENTO}, {HORARIO_INICIO}, {HORARIO_FIM}, {LOCAL_EVENTO}, {BRINQUEDO}, {VALOR_TOTAL}, {VALOR_PAGO}, {VALOR_RESTANTE}, {DATA_CONTRATO}"}</div>
          <Textarea data-testid="co-template-txt" rows={20} value={template.conteudo} onChange={e => setTemplate({...template, conteudo: e.target.value})} className="font-mono text-xs" />
          <Button data-testid="co-template-save" onClick={saveTemplate} className="rounded-full bg-orange-500 hover:bg-orange-600 w-full mt-4">Salvar modelo</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
