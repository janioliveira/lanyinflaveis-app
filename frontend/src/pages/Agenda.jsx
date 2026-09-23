import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

const colors = { pre_reservada: "#FF4785", confirmada: "#004E98", em_utilizacao: "#FF6B35", concluida: "#22c55e", cancelada: "#94a3b8" };

export default function Agenda() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [toys, setToys] = useState([]);
  const [selected, setSelected] = useState(new Date());

  useEffect(() => {
    api.get("/reservations").then(r => setItems(r.data));
    api.get("/customers").then(r => setCustomers(r.data));
    api.get("/toys").then(r => setToys(r.data));
  }, []);

  const day = selected.toISOString().slice(0, 10);
  const dayItems = items.filter(r => r.start_datetime?.slice(0, 10) === day);

  const eventDays = items.reduce((acc, r) => {
    const d = r.start_datetime?.slice(0, 10);
    if (d) acc[d] = r.status; return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-3xl text-[#004E98]">Agenda</h1><p className="text-slate-500 text-sm">Calendário de eventos.</p></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-4">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            locale={ptBR}
            modifiers={{ booked: (d) => !!eventDays[d.toISOString().slice(0,10)] }}
            modifiersStyles={{ booked: { backgroundColor: "#FFEDD5", color: "#FF6B35", fontWeight: 700, borderRadius: 12 } }}
            className="rounded-xl"
          />
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {Object.entries(colors).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{background: c}} />{k}</div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-6">
          <div className="font-heading text-xl text-[#004E98] mb-4">
            Eventos em {selected.toLocaleDateString("pt-BR")}
          </div>
          <div className="space-y-3">
            {dayItems.length === 0 && <div className="text-slate-400 text-sm">Sem eventos neste dia.</div>}
            {dayItems.map(r => {
              const c = customers.find(x => x.id === r.customer_id);
              const rt = toys.filter(t => r.toy_ids?.includes(t.id)).map(t => t.nome).join(", ");
              return (
                <div key={r.id} data-testid={`agenda-item-${r.id}`} className="border-l-4 rounded-xl p-4 bg-slate-50" style={{borderColor: colors[r.status] || "#94a3b8"}}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-heading text-lg text-[#004E98]">{c?.nome || "—"}</div>
                      <div className="text-sm text-slate-500">{new Date(r.start_datetime).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})} — {new Date(r.end_datetime).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{background: (colors[r.status]||"#94a3b8")+"20", color: colors[r.status]}}>{r.status}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2">{rt}</div>
                  <div className="text-xs text-slate-500 mt-1">{r.endereco_evento}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
