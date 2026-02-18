import { Routes, Route } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Packages from "./pages/Packages";
import Bookings from "./pages/Bookings";
import Availability from "./pages/Availability";
import SelectOrganisation from "./pages/SelectOrganisation";
import Onboarding from "./pages/Onboarding";

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Everything below requires login */}
      <Route element={<RequireAuth />}>
        {/* Onboarding must NOT be inside AppLayout */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Everything below uses AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/select-organisation" element={<SelectOrganisation />} />
        </Route>
      </Route>
    </Routes>
  );
}
