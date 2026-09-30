import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import "@/App.css";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PublicHome from "@/pages/PublicHome";
import { PublicCatalog, PublicToyDetail } from "@/pages/PublicToys";
import CustomerPortal from "@/pages/CustomerPortal";

import AdminLayout from "@/components/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import Toys from "@/pages/Toys";
import Customers from "@/pages/Customers";
import Reservations from "@/pages/Reservations";
import Agenda from "@/pages/Agenda";
import Quotes from "@/pages/Quotes";
import Contracts from "@/pages/Contracts";
import Payments from "@/pages/Payments";
import Financial from "@/pages/Financial";
import Company from "@/pages/Company";
import Users from "@/pages/Users";
import Notifications from "@/pages/Notifications";

function RequireAuth({ children, roles }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "customer" ? "/portal" : "/app"} replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/catalogo" element={<PublicCatalog />} />
          <Route path="/catalogo/:id" element={<PublicToyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/portal" element={<RequireAuth roles={["customer"]}><CustomerPortal /></RequireAuth>} />

          <Route path="/app" element={<RequireAuth roles={["admin","employee"]}><AdminLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="reservas" element={<Reservations />} />
            <Route path="orcamentos" element={<Quotes />} />
            <Route path="clientes" element={<Customers />} />
            <Route path="brinquedos" element={<Toys />} />
            <Route path="contratos" element={<Contracts />} />
            <Route path="pagamentos" element={<Payments />} />
            <Route path="financeiro" element={<Financial />} />
            <Route path="notificacoes" element={<Notifications />} />
            <Route path="empresa" element={<Company />} />
            <Route path="usuarios" element={<Users />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
