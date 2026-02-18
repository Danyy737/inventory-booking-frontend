import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const res = await api.get("/me");
    const payload = res.data;

    setUser(payload?.user ?? null);
    setRole(payload?.role ?? null);
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });

    const token = res.data?.token;
    if (!token) throw new Error("No token returned from API");

    localStorage.setItem("token", token);
    await refreshMe();
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

    refreshMe()
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
        setRole(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
