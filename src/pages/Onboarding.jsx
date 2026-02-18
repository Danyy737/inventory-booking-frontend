import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const { refreshMe, logout } = useAuth();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function createOrg(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/organisations", { name: orgName });
      await refreshMe();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create organisation.");
    } finally {
      setLoading(false);
    }
  }

  async function joinOrg(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/organisations/join", { join_code: joinCode });
      await refreshMe();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to join organisation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <h2>Get started</h2>
      <p>Create an organisation or join one with a code.</p>

      {err && <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>}

      <div style={{ display: "grid", gap: 24, marginTop: 16 }}>
        <form onSubmit={createOrg} style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Create organisation</h3>
          <input
            placeholder="Organisation name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <div style={{ marginTop: 10 }}>
            <button disabled={loading}>{loading ? "Working..." : "Create"}</button>
          </div>
        </form>

        <form onSubmit={joinOrg} style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Join with code</h3>
          <input
            placeholder="Join code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          <div style={{ marginTop: 10 }}>
            <button disabled={loading}>{loading ? "Working..." : "Join"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
