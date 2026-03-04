import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/packages", label: "Packages" },
  { to: "/addons", label: "Addons" },
  { to: "/bookings", label: "Bookings" },
  { to: "/availability", label: "Availability" },
  { to: "/select-organisation", label: "Organisation" },
];

export default function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card sticky top-0 h-screen">
          {/* Brand */}
          <div className="px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center font-semibold text-sm">
                IB
              </div>
              <div>
                <div className="text-sm font-semibold">Inventory Booking</div>
                <div className="text-xs text-muted-foreground">
                  SaaS Admin
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>

          {/* Footer */}
          <div className="mt-auto p-4 space-y-3">
            {user?.role && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Role</span>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            )}

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

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="h-14 border-b bg-card flex items-center justify-between px-6">
            <div className="text-sm text-muted-foreground">
              {user?.current_organisation?.name
                ? `Organisation: ${user.current_organisation.name}`
                : "No organisation selected"}
            </div>

            <div className="text-sm font-medium">
              {user?.email ?? "User"}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6">
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
      end={to === "/"}
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