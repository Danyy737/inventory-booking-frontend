import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/packages", label: "Packages" },
  { to: "/bookings", label: "Bookings" },
  { to: "/availability", label: "Availability" },
  { to: "/addons", label: "Addons" },
  { to: "/select-organisation", label: "Organisation" },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
          <div className="px-4 py-4">
            <div className="text-sm font-semibold">Inventory Booking</div>
            <div className="text-xs text-muted-foreground mt-1">
              Admin Panel
            </div>
          </div>

          <Separator />

          <nav className="p-2 space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>

          <div className="mt-auto p-4">
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4">
            <div className="text-sm text-muted-foreground">
              Welcome back
            </div>
          </header>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "block rounded-md px-3 py-2 text-sm transition",
          isActive
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}