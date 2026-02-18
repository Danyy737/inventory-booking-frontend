import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  const noOrgSelected = !user?.current_organisation_id;
  const onSelectPage = location.pathname === "/select-organisation";

  if (noOrgSelected && !onSelectPage) {
    return <Navigate to="/select-organisation" replace />;
  }

  return <Outlet />;
}
