import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

function isAdminLike(role) {
  return role === "owner" || role === "admin";
}

export default function Dashboard() {
  const { user, role, currentOrganisation, refreshMe } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  const joinCode = useMemo(() => {
    const raw = currentOrganisation?.join_code;
    if (!raw) return null;
    return String(raw).trim().toUpperCase();
  }, [currentOrganisation?.join_code]);

  async function copyJoinCode() {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      alert("Join code copied.");
    } catch {
      window.prompt("Copy join code:", joinCode);
    }
  }

  async function fetchMembers() {
    setMembersErr("");
    setLoadingMembers(true);

    try {
      const res = await api.get("/organisations/members");
      const payload = res?.data?.data ?? [];
      setMembers(Array.isArray(payload) ? payload : []);
    } catch (e) {
      const status = e?.response?.status;

      if (status === 401) setMembersErr("Unauthenticated. Please log out and log in again.");
      else if (status === 403) setMembersErr("Members list is only available to admins/owners.");
      else if (status === 409) setMembersErr("No active organisation selected.");
      else setMembersErr(e?.response?.data?.message || "Failed to load members.");

      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  // Ensure dashboard is hydrated (pull /me again on mount if needed)
  useEffect(() => {
    if (user && !currentOrganisation) {
      refreshMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load members when admin-like + org exists
  useEffect(() => {
    if (isAdminLike(role) && currentOrganisation?.id) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, currentOrganisation?.id]);

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2>Dashboard</h2>

      <div style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Organisation</h3>

        <div style={{ display: "grid", gap: 6 }}>
          <div>
            <strong>Signed in as:</strong> {user?.email}
          </div>

          <div>
            <strong>Role:</strong> {role || "Not available"}
          </div>

          <div>
            <strong>Current organisation:</strong>{" "}
            {currentOrganisation?.name
              ? `${currentOrganisation.name} (ID ${currentOrganisation.id})`
              : "Not available"}
          </div>

          {isAdminLike(role) && (
            <div style={{ marginTop: 10 }}>
              <strong>Join code:</strong>{" "}
              <code style={{ padding: "2px 6px", border: "1px solid #ddd" }}>
                {joinCode || "Not available"}
              </code>

              {joinCode && (
                <button type="button" onClick={copyJoinCode} style={{ marginLeft: 10 }}>
                  Copy
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isAdminLike(role) && (
        <div style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Members</h3>
            <button type="button" onClick={fetchMembers} disabled={loadingMembers}>
              Refresh
            </button>
          </div>

          {membersErr && <div style={{ color: "crimson", marginTop: 10 }}>{membersErr}</div>}

          {loadingMembers ? (
            <div style={{ marginTop: 10 }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ marginTop: 10 }}>No members found.</div>
          ) : (
            <div style={{ marginTop: 10, border: "1px solid #eee" }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.5fr 0.6fr",
                    gap: 10,
                    padding: 10,
                    borderTop: "1px solid #eee",
                    alignItems: "center",
                  }}
                >
                  <div>{m.name}</div>
                  <div style={{ color: "#555" }}>{m.email}</div>
                  <div style={{ fontWeight: 600 }}>{m.role}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
