// src/components/Nav.jsx
import { NavLink } from "react-router-dom";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
          isActive
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        ].join(" ")
      }
      end={to === "/"}
    >
      {children}
    </NavLink>
  );
}

export default function Nav() {
  return (
    <aside className="min-h-screen border-r bg-background">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border bg-muted flex items-center justify-center text-sm font-semibold">
            IB
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Inventory Booking</div>
            <div className="text-xs text-muted-foreground">SaaS MVP</div>
          </div>
        </div>
      </div>

      <div className="px-2">
        <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
          Navigation
        </div>

        <nav className="grid gap-1 px-2 pb-4">
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/inventory">Inventory</NavItem>
          <NavItem to="/packages">Packages</NavItem>
          <NavItem to="/addons">Addons</NavItem>
          <NavItem to="/bookings">Bookings</NavItem>
          <NavItem to="/availability">Availability</NavItem>
        </nav>
      </div>
    </aside>
  );
}