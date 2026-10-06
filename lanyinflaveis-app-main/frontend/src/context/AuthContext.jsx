import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=guest, obj=user
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then(r => setUser(r.data))
      .catch(() => setUser(false))
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  }
  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    setUser(data);
    return data;
  }
  async function logout() {
    try { await api.post("/auth/logout"); } catch (_) {}
    setUser(false);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
