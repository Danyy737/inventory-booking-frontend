import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: "80px auto" }}>
      <h1>Login</h1>
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />
        <button type="submit">Sign in</button>
      </form>

      {/* Register button */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => nav("/register")}
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            padding: 0
          }}
        >
          Don’t have an account? Create one
        </button>
      </div>
    </div>
  );
}
