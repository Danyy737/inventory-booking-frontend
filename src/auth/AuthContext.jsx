import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [currentOrganisation, setCurrentOrganisation] = useState(null);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);

  function clearAuthState() {
    setUser(null);
    setRole(null);
    setCurrentOrganisation(null);
    setOrganisations([]);
  }

  async function refreshMe() {
    // If there's no token, treat as logged out
    const token = localStorage.getItem("token");
    if (!token) {
      clearAuthState();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1) Bootstrap identity + current org + role (works even if no org selected)
      const meResponse = await api.get("/me");
      const meData = meResponse?.data;

      setUser(meData?.user ?? null);
      setRole(meData?.role ?? null);
      setCurrentOrganisation(meData?.current_organisation ?? null);

      // 2) Fetch org memberships list
      const orgsResponse = await api.get("/my/organisations");
      const orgsData = orgsResponse?.data?.data ?? [];

      setOrganisations(Array.isArray(orgsData) ? orgsData : []);
    } catch (e) {
      // Token invalid/expired/etc
      localStorage.removeItem("token");
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    const token = res?.data?.token;

    if (!token) throw new Error("Login succeeded but no token was returned.");

    localStorage.setItem("token", token);
    await refreshMe();
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore (token may already be invalid)
    } finally {
      localStorage.removeItem("token");
      clearAuthState();
    }
  }

  // On app load, bootstrap auth state if token exists
  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      currentOrganisation,
      organisations,
      loading,
      refreshMe,
      login,
      logout,
    }),
    [user, role, currentOrganisation, organisations, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
