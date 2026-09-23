import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CalendarDays, Package, Wallet, Clock, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/dashboard/stats").then(r => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <div className="text-slate-500">Carregando...</div>;

  const cards = [
    { icon: CalendarDays, label: "Reservas hoje", value: stats.reservas_hoje, color: "orange" },
    { icon: CalendarDays, label: "Reservas na semana", value: stats.reservas_semana, color: "pink" },
    { icon: CalendarDays, label: "Reservas no mês", value: stats.reservas_mes, color: "blue" },
    { icon: Package, label: "Brinquedos ativos", value: stats.brinquedos_ativos, color: "orange" },
    { icon: Wallet, label: "Faturamento do mês", value: `R$ ${(stats.faturamento_mes || 0).toFixed(2)}`, color: "green" },
    { icon: Clock, label: "Pagamentos pendentes", value: `R$ ${(stats.pagamentos_pendentes || 0).toFixed(2)}`, color: "pink" },
  ];
  const colors = ["#FF6B35", "#FF4785", "#004E98", "#F59E0B"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-[#004E98] tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm">Visão geral do seu negócio.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <div key={i} data-testid={`kpi-${i}`} className="bg-white rounded-2xl p-5 border border-slate-200 transition-elev hover:shadow-lg">
            <div className={`w-10 h-10 rounded-xl bg-${c.color}-100 text-${c.color}-600 flex items-center justify-center mb-3`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{c.label}</div>
            <div className="font-heading text-3xl text-[#004E98] mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="font-heading text-xl text-[#004E98] mb-4">Faturamento (últimos 6 meses)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.faturamento_por_mes}>
              <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip formatter={(v) => `R$ ${v.toFixed(2)}`} />
              <Bar dataKey="valor" fill="#FF6B35" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="font-heading text-xl text-[#004E98] mb-4">Brinquedos mais alugados</div>
          {stats.top_brinquedos.length === 0 ? (
            <div className="text-slate-400 text-sm">Sem dados ainda.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.top_brinquedos} dataKey="count" nameKey="nome" outerRadius={90} label>
                  {stats.top_brinquedos.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {stats.proximo_evento && (
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl p-6">
          <div className="text-xs uppercase font-bold tracking-wide opacity-80">Próximo evento</div>
          <div className="font-heading text-2xl mt-1">{new Date(stats.proximo_evento.start_datetime).toLocaleString("pt-BR")}</div>
          <div className="opacity-90 mt-1">{stats.proximo_evento.endereco_evento}</div>
        </div>
      )}
    </div>
  );
}
