import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast.success(`Conta criada! Bem-vindo, ${u.name}.`);
      nav("/portal");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F5] p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg shadow-orange-500/10 border border-orange-100">
        <div className="font-heading text-3xl text-[#004E98] mb-2">Criar conta</div>
        <p className="text-slate-500 mb-6">Reserve seus brinquedos favoritos da Lany Infláveis.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input data-testid="register-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input data-testid="register-email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input data-testid="register-password" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="rounded-xl mt-1" />
          </div>
          <Button data-testid="register-submit" type="submit" disabled={loading} className="w-full rounded-full bg-orange-500 hover:bg-orange-600 h-11 font-semibold">
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <div className="mt-6 text-sm text-slate-600 text-center">
          Já tem conta? <Link data-testid="link-login" to="/login" className="text-orange-600 font-semibold hover:underline">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
