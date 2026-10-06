import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { printContract } from "@/lib/printPdf";

export default function Contracts() {
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState({});
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  async function load() {
    const [c, co] = await Promise.all([api.get("/contracts"), api.get("/company")]);
    setItems(c.data); setCompany(co.data || {});
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-3xl text-[#004E98]">Contratos</h1><p className="text-slate-500 text-sm">Contratos gerados.</p></div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-4">Reserva</th><th className="text-left p-4">Status</th><th className="text-left p-4">Criado</th><th></th></tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-4 font-mono text-xs">{c.reservation_id}</td>
                <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${c.status === "assinado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span></td>
                <td className="p-4">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-4 text-right flex gap-2 justify-end">
                  <Button data-testid={`ct-view-${c.id}`} size="sm" variant="outline" onClick={() => { setCurrent(c); setOpen(true); }}>Visualizar</Button>
                  <Button data-testid={`ct-pdf-${c.id}`} size="sm" variant="outline" onClick={() => printContract({ contract: c, company })} className="gap-1"><FileDown className="w-3 h-3" />PDF</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Contrato</DialogTitle></DialogHeader>
          {current && <pre className="text-xs whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-xl">{current.content}</pre>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
