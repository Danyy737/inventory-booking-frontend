import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user, role } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Email: {user?.email ?? "unknown"}</p>
      <p>Role: {role ?? "unknown"}</p>
    </div>
  );
}
