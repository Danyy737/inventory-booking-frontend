import {
  LayoutDashboard,
  Boxes,
  Package,
  PlusCircle,
  Calendar,
  Clock,
  Building,
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", to: "/inventory", icon: Boxes },
  { label: "Packages", to: "/packages", icon: Package },
  { label: "Addons", to: "/addons", icon: PlusCircle },
  { label: "Bookings", to: "/bookings", icon: Calendar },
  { label: "Availability", to: "/availability", icon: Clock },
  { label: "Organisation", to: "/organisation", icon: Building },
];