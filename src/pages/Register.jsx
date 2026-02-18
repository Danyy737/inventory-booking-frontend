import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await register(name, email, password);
      navigate("/dashboard", { replace: true }); // RequireAuth will redirect if onboarding needed
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Register failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h2>Register</h2>

      {err && <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>}

      <form onSubmit={onSubmit} style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
