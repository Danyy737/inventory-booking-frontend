import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { user, organisations, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const hasNoOrgs = organisations.length === 0;
  const hasNoActiveOrg = !user?.current_organisation_id;

  const onOnboarding = location.pathname === "/onboarding";
  const onSelectOrg = location.pathname === "/select-organisation";

  // ✅ If user belongs to no orgs at all, force onboarding
  if (hasNoOrgs && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // ✅ If user has org memberships but hasn’t selected one, force select-org
  if (!hasNoOrgs && hasNoActiveOrg && !onSelectOrg) {
    return <Navigate to="/select-organisation" replace />;
  }

  return <Outlet />;
}
