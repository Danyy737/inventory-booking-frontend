import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SelectOrganisation() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectingId, setSelectingId] = useState(null);

  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setError("");
        const res = await api.get("/my/organisations");
        if (!isMounted) return;
        setOrgs(res.data?.data ?? []);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.response?.data?.message || "Failed to load organisations.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, []);

  async function handleSelect(orgId) {
    try {
      setSelectingId(orgId);
      setError("");
      await api.post("/me/select-organisation", { organisation_id: orgId });
      await refreshMe(); // update role/current org in context
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to select organisation.");
    } finally {
      setSelectingId(null);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading organisations…</div>;

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2>Select an organisation</h2>

      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          {error}
        </div>
      )}

      {orgs.length === 0 ? (
        <p style={{ marginTop: 12 }}>
          You don’t belong to any organisations yet.
        </p>
      ) : (
        <ul style={{ marginTop: 12, paddingLeft: 18 }}>
          {orgs.map((org) => (
            <li key={org.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div><strong>{org.name}</strong></div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    role: {org.role ?? "unknown"} • slug: {org.slug ?? "-"}
                  </div>
                </div>
                <button
                  onClick={() => handleSelect(org.id)}
                  disabled={selectingId !== null}
                >
                  {selectingId === org.id ? "Selecting…" : "Select"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
