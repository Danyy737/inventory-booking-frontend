import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

function toIntOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function dollarsToCents(dollars) {
  // handles "5", "5.5", "5.50"
  const n = Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export default function AddonForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [inventoryOptions, setInventoryOptions] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingType, setPricingType] = useState("per_unit");
  const [priceDollars, setPriceDollars] = useState("0.00");
  const [isActive, setIsActive] = useState(true);

  // items: { inventory_item_id, quantity_per_unit }
  const [items, setItems] = useState([{ inventory_item_id: "", quantity_per_unit: 1 }]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!pricingType) return false;
    // At least one item with inventory id + quantity > 0
    const validItems = items.filter(
      (it) => String(it.inventory_item_id).trim() !== "" && toIntOrZero(it.quantity_per_unit) > 0
    );
    return validItems.length > 0;
  }, [name, pricingType, items]);

  async function loadInventory() {
    // If your inventory endpoint differs, change this.
    const res = await api.get("/inventory/items");
    setInventoryOptions(res.data?.data ?? []);
  }

  async function loadAddon(addonId) {
    // If you have a show route, prefer it. Otherwise we can fetch list and find.
    // Try show first:
    try {
      const res = await api.get(`/addons/${addonId}`);
      const a = res.data?.data ?? res.data; // handle either style
      return a;
    } catch {
      const res = await api.get("/addons");
      const list = res.data?.data ?? [];
      return list.find((x) => String(x.id) === String(addonId));
    }
  }

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        await loadInventory();

        if (isEdit) {
          const a = await loadAddon(id);
          if (!a) throw new Error("Addon not found");

          setName(a.name ?? "");
          setDescription(a.description ?? "");
          setPricingType(a.pricing_type ?? "per_unit");
          setPriceDollars(centsToDollars(a.price_cents ?? 0));
          setIsActive(Boolean(a.is_active));

          const loadedItems =
            (a.items ?? []).map((it) => ({
              inventory_item_id: it.inventory_item_id ?? "",
              quantity_per_unit: it.quantity_per_unit ?? 1,
            })) || [];

          setItems(loadedItems.length ? loadedItems : [{ inventory_item_id: "", quantity_per_unit: 1 }]);
        }
      } catch (e) {
        setErr("Failed to load addon form.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  function updateItem(idx, patch) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }

  function addItemRow() {
    setItems((prev) => [...prev, { inventory_item_id: "", quantity_per_unit: 1 }]);
  }

  function removeItemRow(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setErr("");

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      pricing_type: pricingType,
      price_cents: dollarsToCents(priceDollars),
      is_active: isActive ? 1 : 0,
      items: items
        .filter((it) => String(it.inventory_item_id).trim() !== "" && toIntOrZero(it.quantity_per_unit) > 0)
        .map((it) => ({
          inventory_item_id: toIntOrZero(it.inventory_item_id),
          quantity_per_unit: toIntOrZero(it.quantity_per_unit),
        })),
    };

    try {
      if (isEdit) {
        await api.put(`/addons/${id}`, payload);
      } else {
        await api.post("/addons", payload);
      }
      navigate("/addons");
    } catch (e) {
      setErr("Save failed. Check required fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{isEdit ? "Edit Addon" : "Create Addon"}</h1>
        <Link to="/addons">Back</Link>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Extra Chairs" />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={3}
          />
        </label>

        <label>
          Pricing Type
          <select value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
            <option value="per_unit">per_unit</option>
            <option value="flat_fee">flat_fee</option>
          </select>
        </label>

        <label>
          Price (AUD)
          <input
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 5.00"
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong>Items</strong>
            <button type="button" onClick={addItemRow}>+ Add item</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  Inventory Item
                  <select
                    value={it.inventory_item_id}
                    onChange={(e) => updateItem(idx, { inventory_item_id: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {inventoryOptions.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  Qty / Unit
                  <input
                    value={it.quantity_per_unit}
                    onChange={(e) => updateItem(idx, { quantity_per_unit: e.target.value })}
                    inputMode="numeric"
                  />
                </label>

                <div style={{ display: "flex", alignItems: "end" }}>
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length === 1}
                    style={{ width: "100%" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div style={{ color: "#666", marginTop: 6 }}>
              Tip: Addons can include multiple inventory items (e.g., chairs + tables per unit).
            </div>
          </div>
        </div>

        <button type="submit" disabled={!canSave || saving}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Addon"}
        </button>

        {!canSave && (
          <p style={{ color: "#666", margin: 0 }}>
            Required: name + at least 1 item with inventory + qty &gt; 0.
          </p>
        )}
      </form>
    </div>
  );
}