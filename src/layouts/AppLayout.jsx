import { Outlet } from "react-router-dom";
import Nav from "../components/Nav";

export default function AppLayout() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <Nav />
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}
