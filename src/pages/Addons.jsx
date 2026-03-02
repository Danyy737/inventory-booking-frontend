import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function formatCents(cents) {
  const dollars = (Number(cents || 0) / 100).toFixed(2);
  return `$${dollars}`;
}

export default function Addons() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function fetchAddons() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/addons");
      setAddons(res.data?.data ?? []);
    } catch (e) {
      setErr("Failed to load addons.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAddon(id) {
    const ok = window.confirm("Delete this addon? This cannot be undone.");
    if (!ok) return;

    try {
      await api.delete(`/addons/${id}`);
      setAddons((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert("Failed to delete addon.");
    }
  }

  useEffect(() => {
    fetchAddons();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Addons</h1>
        <Link to="/addons/new">+ Create Addon</Link>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {!err && addons.length === 0 && <p>No addons yet.</p>}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {addons.map((a) => (
          <div key={a.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{a.name}</strong>{" "}
                {!a.is_active && <span style={{ color: "#666" }}>(inactive)</span>}
                <div style={{ color: "#666", marginTop: 4 }}>{a.description || "—"}</div>
                <div style={{ marginTop: 8 }}>
                  <span>Pricing: </span>
                  <strong>{a.pricing_type}</strong>{" "}
                  <span style={{ color: "#666" }}>• {formatCents(a.price_cents)}</span>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ color: "#666" }}>Items:</div>
                  {(a.items ?? []).length === 0 ? (
                    <div>—</div>
                  ) : (
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {a.items.map((it) => (
                        <li key={it.id}>
                          {it.inventory_item?.name ?? `Inventory #${it.inventory_item_id}`}{" "}
                          — qty/unit: {it.quantity_per_unit}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <Link to={`/addons/${a.id}/edit`}>Edit</Link>
                <button onClick={() => deleteAddon(a.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}