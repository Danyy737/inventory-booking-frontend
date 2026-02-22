import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Create form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editQuantity, setEditQuantity] = useState(0);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [items]);

  async function fetchItems() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/inventory/items");
      // Support either { data: [...] } or [...]
      const payload = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load inventory items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function createItem(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const res = await api.post("/inventory/items", {
        name,
        sku: sku || null,
        total_quantity: Number(quantity),
      });

      const created = res?.data?.data ?? res?.data;
      // Optimistic add if we got an item back; otherwise refetch
      if (created && created.id) {
        setItems((prev) => [created, ...prev]);
      } else {
        await fetchItems();
      }

      setName("");
      setSku("");
      setQuantity(0);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create item.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name ?? "");
    setEditSku(item.sku ?? "");
    setEditQuantity(Number(item.quantity ?? 0));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSku("");
    setEditQuantity(0);
  }

  async function saveEdit(id) {
    setErr("");
    setSaving(true);
    try {
      await api.patch(`/inventory/items/${id}`, {
        name: editName,
        sku: editSku || null,
        total_quantity: Number(editQuantity),
      });

      // Update local list
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, name: editName, sku: editSku || null, quantity: Number(editQuantity) }
            : it
        )
      );
      cancelEdit();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    const ok = window.confirm("Delete this item? This cannot be undone.");
    if (!ok) return;

    setErr("");
    setSaving(true);
    try {
      await api.delete(`/inventory/items/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          "Failed to delete item. It may be referenced by a package."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2>Inventory</h2>
      <p style={{ marginTop: 6 }}>Create, edit, and manage your inventory items.</p>

      {err && <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>}

      {/* Create */}
      <form
        onSubmit={createItem}
        style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}
      >
        <h3 style={{ marginTop: 0 }}>Add item</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder="SKU (optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            placeholder="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min={0}
            required
          />
          <button disabled={saving || !name.trim()}>
            {saving ? "Working..." : "Create item"}
          </button>
        </div>
      </form>

      {/* List */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Items</h3>
          <button type="button" onClick={fetchItems} disabled={loading || saving}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ marginTop: 10 }}>Loading…</div>
        ) : sortedItems.length === 0 ? (
          <div style={{ marginTop: 10 }}>No items yet.</div>
        ) : (
          <div style={{ marginTop: 10, border: "1px solid #ddd" }}>
            {sortedItems.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr auto",
                    gap: 10,
                    padding: 12,
                    borderTop: "1px solid #eee",
                    alignItems: "center",
                  }}
                >
                  {isEditing ? (
                    <>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <input value={editSku} onChange={(e) => setEditSku(e.target.value)} />
                      <input
                        type="number"
                        min={0}
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          disabled={saving || !editName.trim()}
                        >
                          Save
                        </button>
                        <button type="button" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          SKU: {item.sku || "—"}
                        </div>
                      </div>
                      <div>Qty: {item?.stock?.total_quantity ?? 0}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>ID: {item.id}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => startEdit(item)} disabled={saving}>
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteItem(item.id)} disabled={saving}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
