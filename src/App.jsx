import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";

import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Packages from "./pages/Packages";
import Bookings from "./pages/Bookings";
import Availability from "./pages/Availability";
import SelectOrganisation from "./pages/SelectOrganisation";

import BookingNew from "./pages/BookingNew";
import BookingDetail from "./pages/BookingDetail";

import Addons from "./pages/Addons";
import AddonForm from "./pages/AddonForm";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<RequireAuth />}>
        {/* Onboarding must NOT use AppLayout */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* App layout shell */}
        <Route element={<AppLayout />}>
          {/* Dashboard lives at "/" */}
          <Route path="/" element={<Dashboard />} />

          {/* Redirect /dashboard -> / */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          <Route path="/inventory" element={<Inventory />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/new" element={<BookingNew />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/select-organisation" element={<SelectOrganisation />} />

          <Route path="/addons" element={<Addons />} />
          <Route path="/addons/new" element={<AddonForm mode="create" />} />
          <Route path="/addons/:id/edit" element={<AddonForm mode="edit" />} />
        </Route>
      </Route>
    </Routes>
  );
}