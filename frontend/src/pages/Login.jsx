import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("admin@lanyinflaveis.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bem-vindo, ${u.name}!`);
      nav(u.role === "customer" ? "/portal" : "/app");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#FFF9F5]">
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-orange-500 via-pink-500 to-blue-700">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 2px, transparent 3px), radial-gradient(circle at 80% 60%, white 2px, transparent 3px)", backgroundSize: "80px 80px" }}/>
        <div className="relative z-10 text-white p-16 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-8">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="font-heading text-5xl leading-tight mb-4">Diversão que gerencia sozinha.</h1>
          <p className="text-white/80 text-lg">Reservas, agenda, contratos, pagamentos — tudo o que a Lany Infláveis precisa em um só lugar.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg shadow-orange-500/10 border border-orange-100">
          <div className="mb-8">
            <div className="font-heading text-3xl text-[#004E98]">Bem-vindo de volta</div>
            <p className="text-slate-500 mt-1">Entre para acessar o painel.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl mt-1" required />
            </div>
            <div>
              <Label>Senha</Label>
              <Input data-testid="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl mt-1" required />
            </div>
            <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full rounded-full bg-orange-500 hover:bg-orange-600 text-white h-11 font-semibold">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 text-sm text-slate-600 text-center">
            Não tem conta? <Link data-testid="link-register" to="/register" className="text-orange-600 font-semibold hover:underline">Criar conta</Link>
          </div>
          <div className="mt-4 text-xs text-slate-400 text-center">
            <Link to="/" className="hover:underline">← Voltar para o site</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
