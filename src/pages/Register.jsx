import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      const token = res?.data?.token;
      if (!token) {
        throw new Error("No token returned from register.");
      }

      localStorage.setItem("token", token);

      // Pull /me + /my/organisations so RequireAuth routes correctly
      await refreshMe();

      // Let your existing route guard decide where they go next
      navigate("/", { replace: true });
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          (e?.response?.data?.errors
            ? Object.values(e.response.data.errors).flat().join(" ")
            : null) ||
          e?.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>Create account</h2>
      <p style={{ marginTop: 6 }}>
        Register to create or join an organisation.
      </p>

      {err && <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>}

      <form
        onSubmit={handleSubmit}
        style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <input
            placeholder="Confirm password"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            autoComplete="new-password"
          />

          <button disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => navigate("/login")}
          style={{ border: "none", background: "transparent", color: "#2563eb", padding: 0, cursor: "pointer" }}
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  );
}
