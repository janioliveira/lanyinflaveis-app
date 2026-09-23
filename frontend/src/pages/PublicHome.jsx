import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Ruler, Users, Calendar } from "lucide-react";

export default function PublicHome() {
  const [toys, setToys] = useState([]);
  useEffect(() => {
    api.get("/toys?public=true").then(r => setToys(r.data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF9F5]">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="font-heading text-xl text-[#004E98]">Lany Infláveis</div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/catalogo" data-testid="nav-catalog" className="hidden sm:inline text-sm font-semibold text-slate-700 hover:text-orange-600">Brinquedos</Link>
            <Link to="/login" data-testid="nav-login" className="text-sm font-semibold text-slate-700 hover:text-orange-600">Entrar</Link>
            <Link to="/register"><Button data-testid="nav-register" className="rounded-full bg-orange-500 hover:bg-orange-600 h-10 px-5 font-semibold">Reservar</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-6">
            <Star className="w-3.5 h-3.5" /> Festas inesquecíveis
          </div>
          <h1 className="font-heading text-5xl md:text-6xl leading-none text-[#004E98] tracking-tight mb-6">
            Diversão que <span className="text-orange-500">infla</span> sorrisos.
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mb-8">
            Alugue brinquedos infláveis, camas elásticas, toboãs e muito mais para transformar a festa das crianças em uma aventura inesquecível.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/catalogo"><Button data-testid="hero-catalog" className="rounded-full bg-orange-500 hover:bg-orange-600 h-12 px-8 font-semibold text-base transition-elev">Ver brinquedos</Button></Link>
            <Link to="/register"><Button data-testid="hero-register" variant="outline" className="rounded-full h-12 px-8 border-2 border-blue-700 text-blue-700 hover:bg-blue-50 font-semibold">Criar conta</Button></Link>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/20 aspect-[4/5]">
            <img src="https://images.pexels.com/photos/16138038/pexels-photo-16138038.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Castelo inflável" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-orange-100 hidden md:block">
            <div className="text-3xl font-heading text-orange-500">+500</div>
            <div className="text-xs text-slate-500 font-semibold">festas realizadas</div>
          </div>
        </div>
      </section>

      {/* Featured toys */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-orange-500 font-bold uppercase text-xs tracking-wider mb-2">Catálogo</div>
            <h2 className="font-heading text-4xl text-[#004E98] tracking-tight">Nossos brinquedos</h2>
          </div>
          <Link to="/catalogo" className="text-orange-600 font-semibold text-sm hover:underline">Ver todos →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {toys.map(t => (
            <Link to={`/catalogo/${t.id}`} key={t.id} data-testid={`toy-card-${t.id}`} className="group bg-white rounded-3xl overflow-hidden border border-orange-100 transition-elev hover:shadow-xl hover:shadow-orange-500/10">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={t.fotos?.[0] || "https://images.pexels.com/photos/10032947/pexels-photo-10032947.jpeg?auto=compress"} alt={t.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <div className="text-xs font-bold text-pink-600 uppercase tracking-wide">{t.categoria}</div>
                <div className="font-heading text-xl text-[#004E98] mt-1">{t.nome}</div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{t.comprimento}×{t.largura}m</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.capacidade}</span>
                </div>
                <div className="flex items-end justify-between mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-slate-500">Diária a partir de</div>
                    <div className="font-heading text-2xl text-orange-500">R$ {(t.valor_promocional || t.valor_diaria || 0).toFixed(0)}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-orange-100 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Lany Infláveis · <a href="https://instagram.com/lanyinflaveis" className="text-orange-600 font-semibold">@lanyinflaveis</a>
      </footer>
    </div>
  );
}
