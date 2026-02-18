import { Outlet, useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <Nav />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={handleLogout}>Logout</button>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
