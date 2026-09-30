import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Calendar, Package, Users, FileText, CreditCard, Wallet, Settings, UserCog, ClipboardList, LogOut, Sparkles, Menu, X, Bell } from "lucide-react";
import { useState } from "react";

const navAdmin = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/agenda", icon: Calendar, label: "Agenda" },
  { to: "/app/reservas", icon: ClipboardList, label: "Reservas" },
  { to: "/app/orcamentos", icon: FileText, label: "Orçamentos" },
  { to: "/app/clientes", icon: Users, label: "Clientes" },
  { to: "/app/brinquedos", icon: Package, label: "Brinquedos" },
  { to: "/app/contratos", icon: FileText, label: "Contratos" },
  { to: "/app/pagamentos", icon: CreditCard, label: "Pagamentos" },
  { to: "/app/financeiro", icon: Wallet, label: "Financeiro" },
  { to: "/app/notificacoes", icon: Bell, label: "Notificações" },
  { to: "/app/usuarios", icon: UserCog, label: "Usuários" },
  { to: "/app/empresa", icon: Settings, label: "Empresa" },
];

const navEmployee = navAdmin.filter(i => !["/app/financeiro","/app/usuarios","/app/empresa"].includes(i.to));

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const items = user?.role === "admin" ? navAdmin : navEmployee;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed lg:static z-40 h-screen w-72 bg-[#004E98] text-white flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} lg:flex`}>
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading text-lg">Lany Infláveis</div>
            <div className="text-xs text-white/60">Painel administrativo</div>
          </div>
          <button data-testid="sidebar-close" className="ml-auto lg:hidden" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`nav-${label.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-white text-[#004E98]" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-xs text-white/60 capitalize">{user?.role}</div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={async () => { await logout(); nav("/login"); }}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center justify-between">
          <button data-testid="sidebar-open" onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="font-heading text-lg text-[#004E98]">Lany Infláveis</div>
          <div className="w-6" />
        </div>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
