import { Link } from "react-router-dom";

export default function Nav() {
  return (
    <div style={{ padding: 12, borderRight: "1px solid #ddd", minHeight: "100vh" }}>
      <h3>Inventory SaaS</h3>
      <nav style={{ display: "grid", gap: 8, marginTop: 16 }}>
        <Link to="/">Dashboard</Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/packages">Packages</Link>
        <Link to="/bookings">Bookings</Link>
        <Link to="/availability">Availability</Link>
      </nav>
    </div>
  );
}
