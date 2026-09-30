import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, LogOut, Copy, CheckCircle2 } from "lucide-react";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

const statusColor = { pre_reservada: "bg-pink-100 text-pink-700", confirmada: "bg-green-100 text-green-700", cancelada: "bg-slate-100 text-slate-500" };

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [toys, setToys] = useState({});
  const nav = useNavigate();

  async function load() {
    const [r, c, ts] = await Promise.all([api.get("/reservations"), api.get("/contracts"), api.get("/toys?public=true")]);
    setReservas(r.data); setContracts(c.data);
    setToys(Object.fromEntries(ts.data.map(t => [t.id, t])));
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#FFF9F5]">
      <header className="bg-white border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <div className="font-heading text-xl text-[#004E98]">Lany Infláveis</div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600 hidden sm:block">Olá, <b>{user?.name}</b></div>
            <Button data-testid="portal-logout" size="sm" variant="outline" onClick={async () => { await logout(); nav("/"); }} className="rounded-full gap-1"><LogOut className="w-3 h-3" />Sair</Button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-heading text-4xl text-[#004E98] tracking-tight">Meu portal</h1>
          <p className="text-slate-500">Suas reservas, pagamentos e contratos.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/catalogo"><Button className="rounded-full bg-orange-500 hover:bg-orange-600">Fazer nova reserva</Button></Link>
        </div>

        <div>
          <div className="font-heading text-2xl text-[#004E98] mb-4">Reservas</div>
          <div className="space-y-3">
            {reservas.length === 0 && <div className="text-slate-400 bg-white p-6 rounded-2xl border border-orange-100">Você ainda não tem reservas.</div>}
            {reservas.map(r => (
              <ReservationCard key={r.id} r={r} toys={toys} onReload={load} contracts={contracts} />
            ))}
          </div>
        </div>
      </div>
      <WhatsAppFloat message="Olá! Tenho uma reserva na Lany Infláveis e gostaria de tirar uma dúvida." />
    </div>
  );
}

function ReservationCard({ r, toys, onReload, contracts }) {
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("pix");
  const [payment, setPayment] = useState(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [contract, setContract] = useState(null);
  const [signName, setSignName] = useState("");
  const [signCpf, setSignCpf] = useState("");

  const contractExisting = contracts.find(c => c.reservation_id === r.id);
  const rt = r.toy_ids?.map(id => toys[id]?.nome).filter(Boolean).join(", ");

  async function pay() {
    try {
      const { data } = await api.post("/payments", { reservation_id: r.id, amount: r.valor_total, method });
      setPayment(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function confirmPay() {
    try { await api.post(`/payments/${payment.id}/simulate-confirm`); toast.success("Pagamento confirmado!"); setPayOpen(false); setPayment(null); onReload(); }
    catch (e) { toast.error("Erro"); }
  }
  async function openContract() {
    try {
      const { data } = await api.post(`/reservations/${r.id}/contract`);
      setContract(data); setContractOpen(true);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }
  async function signContract() {
    try {
      await api.post(`/contracts/${contract.id}/sign`, { nome: signName, cpf: signCpf, aceito: true });
      toast.success("Contrato assinado!"); setContractOpen(false); onReload();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  return (
    <div className="bg-white rounded-2xl border border-orange-100 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-slate-500">{r.numero}</div>
          <div className="font-heading text-xl text-[#004E98] mt-1">{rt}</div>
          <div className="text-sm text-slate-500">{new Date(r.start_datetime).toLocaleString("pt-BR")}</div>
          <div className="text-sm text-slate-500">{r.endereco_evento}</div>
        </div>
        <div className="text-right">
          <div className="font-heading text-2xl text-orange-500">R$ {r.valor_total?.toFixed(2)}</div>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor[r.status] || "bg-slate-100"}`}>{r.status}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {r.status === "pre_reservada" && <Button data-testid={`pay-${r.id}`} onClick={() => setPayOpen(true)} className="rounded-full bg-orange-500 hover:bg-orange-600">Pagar agora</Button>}
        <Button data-testid={`ct-${r.id}`} variant="outline" onClick={openContract} className="rounded-full">
          {contractExisting?.status === "assinado" ? "Ver contrato assinado" : "Ver / assinar contrato"}
        </Button>
      </div>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Pagamento</DialogTitle></DialogHeader>
          {!payment ? (
            <div className="space-y-3">
              <div>
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {["pix", "credit_card", "cash"].map(m => (
                    <button key={m} data-testid={`method-${m}`} onClick={() => setMethod(m)} className={`p-3 rounded-xl text-xs font-semibold border ${method === m ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-200"}`}>{m === "pix" ? "PIX" : m === "credit_card" ? "Cartão" : "Dinheiro"}</button>
                  ))}
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 flex justify-between"><span>Valor</span><b>R$ {r.valor_total?.toFixed(2)}</b></div>
              <Button data-testid="do-pay" onClick={pay} className="w-full rounded-full bg-orange-500 hover:bg-orange-600">Gerar pagamento</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {method === "pix" && (
                <div className="bg-white p-4 rounded-xl border-2 border-orange-200 text-center">
                  <div className="w-40 h-40 mx-auto bg-slate-800 rounded-xl flex items-center justify-center text-white text-xs p-2">QR Code Simulado<br/>{payment.transaction_id}</div>
                  <div className="mt-3 text-xs text-slate-500">Código copia e cola:</div>
                  <div className="bg-slate-50 rounded-lg p-2 text-xs font-mono break-all mt-1">{payment.pix_qr_code}</div>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(payment.pix_qr_code); toast.success("Copiado!"); }} className="rounded-full mt-2 gap-1"><Copy className="w-3 h-3" />Copiar</Button>
                </div>
              )}
              <div className="text-xs text-slate-500 text-center">Ambiente de desenvolvimento: use o botão abaixo para simular a confirmação (em produção o gateway envia via webhook).</div>
              <Button data-testid="sim-confirm" onClick={confirmPay} className="w-full rounded-full bg-green-600 hover:bg-green-700 gap-2"><CheckCircle2 className="w-4 h-4" />Simular pagamento confirmado</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#004E98]">Contrato de locação</DialogTitle></DialogHeader>
          {contract && <pre className="text-xs whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-xl max-h-96 overflow-y-auto">{contract.content}</pre>}
          {contract?.status !== "assinado" ? (
            <div className="space-y-3 mt-4">
              <Input data-testid="sign-name" placeholder="Nome completo" value={signName} onChange={e => setSignName(e.target.value)} />
              <Input data-testid="sign-cpf" placeholder="CPF" value={signCpf} onChange={e => setSignCpf(e.target.value)} />
              <div className="text-xs text-slate-500">Ao clicar em "Aceito e assino", você concorda com todos os termos deste contrato. Seu IP e data/hora serão registrados.</div>
              <Button data-testid="sign-submit" onClick={signContract} className="w-full rounded-full bg-orange-500 hover:bg-orange-600">Aceito e assino</Button>
            </div>
          ) : (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />Contrato assinado em {new Date(contract.signed_at).toLocaleString("pt-BR")}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
