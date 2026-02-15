import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    const res = await api.get("/me");
    const payload = res.data?.data ?? res.data;
    setUser(payload?.user ?? payload);
    setRole(payload?.role ?? payload?.user?.role ?? null);
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password })
    const token = res.data?.token;
    if (!token) throw new Error("No token returned from API");

    localStorage.setItem("token", token);
    await loadMe();
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setRole(null);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    loadMe()
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
        setRole(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
