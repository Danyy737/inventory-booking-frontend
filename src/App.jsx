
import { Routes, Route } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Packages from "./pages/Packages";
import Bookings from "./pages/Bookings";
import Availability from "./pages/Availability";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything below requires login */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/availability" element={<Availability />} />
        </Route>
      </Route>
    </Routes>
  );
}
