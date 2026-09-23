import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ruler, Users, Zap, Clock, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export function PublicCatalog() {
  const [toys, setToys] = useState([]);
  useEffect(() => { api.get("/toys?public=true").then(r => setToys(r.data)); }, []);
  return (
    <div className="min-h-screen bg-[#FFF9F5]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        <Link to="/" className="text-orange-600 font-semibold text-sm inline-flex items-center gap-2 mb-6 hover:underline"><ArrowLeft className="w-4 h-4" />Voltar</Link>
        <h1 className="font-heading text-5xl text-[#004E98] tracking-tight mb-2">Catálogo</h1>
        <p className="text-slate-600 mb-10">Escolha o brinquedo perfeito para sua festa.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {toys.map(t => (
            <Link to={`/catalogo/${t.id}`} key={t.id} data-testid={`catalog-toy-${t.id}`} className="group bg-white rounded-3xl overflow-hidden border border-orange-100 transition-elev hover:shadow-xl">
              <div className="aspect-[4/3] bg-slate-100"><img src={t.fotos?.[0]} alt={t.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
              <div className="p-5">
                <div className="text-xs font-bold text-pink-600 uppercase">{t.categoria}</div>
                <div className="font-heading text-xl text-[#004E98] mt-1">{t.nome}</div>
                <div className="font-heading text-2xl text-orange-500 mt-3">R$ {(t.valor_promocional || t.valor_diaria).toFixed(0)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PublicToyDetail() {
  const { id } = useParams();
  const [toy, setToy] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [endereco, setEndereco] = useState("");
  const [available, setAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => { api.get(`/toys/${id}`).then(r => setToy(r.data)); }, [id]);

  async function check() {
    if (!start || !end) return toast.error("Informe início e fim.");
    try {
      const { data } = await api.get(`/availability?toy_id=${id}&start=${start}&end=${end}`);
      setAvailable(data.available);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  }

  async function reserve() {
    if (!user) return nav("/login");
    if (available !== true) return toast.error("Verifique disponibilidade primeiro.");
    setLoading(true);
    try {
      const payload = {
        customer_id: user.id,
        toy_ids: [id],
        start_datetime: start,
        end_datetime: end,
        endereco_evento: endereco,
        valor_brinquedos: toy.valor_promocional || toy.valor_diaria,
        valor_total: toy.valor_promocional || toy.valor_diaria,
      };
      const { data } = await api.post("/reservations", payload);
      toast.success("Reserva criada! Vá ao seu portal para pagar.");
      nav(`/portal/reserva/${data.id}`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  }

  if (!toy) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#FFF9F5]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        <Link to="/catalogo" className="text-orange-600 font-semibold text-sm inline-flex items-center gap-2 mb-6 hover:underline"><ArrowLeft className="w-4 h-4" />Catálogo</Link>
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="rounded-3xl overflow-hidden aspect-square bg-slate-100">
            <img src={toy.fotos?.[0]} alt={toy.nome} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-xs font-bold text-pink-600 uppercase tracking-wide">{toy.categoria}</div>
            <h1 className="font-heading text-5xl text-[#004E98] tracking-tight mt-2">{toy.nome}</h1>
            <p className="text-slate-600 mt-4">{toy.descricao}</p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Info icon={Ruler} label="Dimensões" value={`${toy.comprimento}×${toy.largura}×${toy.altura}m`} />
              <Info icon={Users} label="Capacidade" value={`${toy.capacidade} crianças`} />
              <Info icon={Sparkles} label="Faixa etária" value={toy.faixa_etaria || "—"} />
              {toy.necessita_energia && <Info icon={Zap} label="Potência" value={toy.potencia || "—"} />}
              <Info icon={Clock} label="Montagem" value={`${toy.tempo_montagem}min`} />
            </div>
            <div className="mt-6 p-6 bg-white rounded-2xl border border-orange-100">
              <div className="text-sm text-slate-500">Diária</div>
              <div className="font-heading text-4xl text-orange-500">R$ {(toy.valor_promocional || toy.valor_diaria).toFixed(2)}</div>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><Input data-testid="rsv-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="rounded-xl mt-1" /></div>
                  <div><Label>Término</Label><Input data-testid="rsv-end" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="rounded-xl mt-1" /></div>
                </div>
                <div><Label>Endereço do evento</Label><Textarea data-testid="rsv-address" value={endereco} onChange={e => setEndereco(e.target.value)} className="rounded-xl mt-1" rows={2} /></div>
                <Button data-testid="rsv-check" type="button" variant="outline" onClick={check} className="w-full rounded-full border-2 border-orange-500 text-orange-600 h-11">Verificar disponibilidade</Button>
                {available === true && <div className="text-sm text-green-600 font-semibold">✓ Disponível!</div>}
                {available === false && <div className="text-sm text-red-600 font-semibold">✗ Indisponível neste período.</div>}
                <Button data-testid="rsv-book" onClick={reserve} disabled={loading || available !== true} className="w-full rounded-full bg-orange-500 hover:bg-orange-600 h-11 font-semibold">
                  {loading ? "Reservando..." : (user ? "Reservar agora" : "Entrar para reservar")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-orange-100">
      <Icon className="w-5 h-5 text-orange-500" />
      <div><div className="text-xs text-slate-500">{label}</div><div className="font-semibold text-slate-800 text-sm">{value}</div></div>
    </div>
  );
}
