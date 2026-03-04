// src/components/Nav.jsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Package,
  PlusCircle,
  Calendar,
  Clock,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/packages", label: "Packages", icon: Package },
  { to: "/addons", label: "Addons", icon: PlusCircle },
  { to: "/bookings", label: "Bookings", icon: Calendar },
  { to: "/availability", label: "Availability", icon: Clock },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
          isActive
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Nav() {
  return (
    <aside className="min-h-screen w-64 border-r bg-background">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border bg-muted flex items-center justify-center text-sm font-semibold">
            IB
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Inventory Booking </div>
            <div className="text-xs text-muted-foreground">SaaS MVP</div>
          </div>
        </div>
      </div>

      <div className="px-2">
        <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
          Navigation
        </div>

        <nav className="grid gap-1 px-2 pb-4">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              end={item.end}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}