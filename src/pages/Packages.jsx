import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

function normalizePackageItems(pkg) {
  const rows = pkg?.package_items ?? [];
  return rows.map((pi) => ({
    inventory_item_id: pi.inventory_item_id,
    name: pi.inventory_item?.name ?? `Item #${pi.inventory_item_id}`,
    quantity: Number(pi.quantity ?? 1),
  }));
}

export default function Packages() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [packages, setPackages] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  // Create form
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");

  // Edit details form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);

  // Items draft
  const [draftItems, setDraftItems] = useState([]);
  const [addItemId, setAddItemId] = useState("");
  const [addQty, setAddQty] = useState(1);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    inventoryItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [inventoryItems]);

  const selectedAddStock = useMemo(() => {
    if (!addItemId) return 0;
    const inv = inventoryMap.get(Number(addItemId));
    return Number(inv?.stock?.total_quantity ?? 0);
  }, [addItemId, inventoryMap]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  async function loadLists({ keepSelection = true } = {}) {
    clearMessages();
    setLoading(true);
    try {
      const [pkgRes, invRes] = await Promise.all([
        api.get("/packages"),
        api.get("/inventory/items"),
      ]);

      const pkgData = pkgRes.data?.data ?? [];
      const invData = invRes.data?.data ?? [];

      setPackages(pkgData);
      setInventoryItems(invData);

      setSelectedId((prev) => {
        if (keepSelection && prev && pkgData.some((p) => p.id === prev)) return prev;
        return pkgData[0]?.id ?? null;
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  async function loadSelected(id) {
    if (!id) {
      setSelected(null);
      setDraftItems([]);
      return;
    }
    clearMessages();
    try {
      const res = await api.get(`/packages/${id}`);
      const pkg = res.data?.data;
      setSelected(pkg);

      setEditName(pkg?.name ?? "");
      setEditDesc(pkg?.description ?? "");
      setEditActive(Boolean(pkg?.is_active));

      setDraftItems(normalizePackageItems(pkg));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load package");
    }
  }

  useEffect(() => {
    loadLists({ keepSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadSelected(selectedId);
    else loadSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function createPackage(e) {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      const res = await api.post("/packages", {
        name: createName.trim(),
        description: createDesc.trim() || null,
      });

      const created = res.data?.data;
      setNotice("Package created.");
      setCreateName("");
      setCreateDesc("");

      await loadLists({ keepSelection: true });
      if (created?.id) setSelectedId(created.id);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create package");
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails() {
    if (!selectedId) return;
    clearMessages();
    setBusy(true);
    try {
      await api.patch(`/packages/${selectedId}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        is_active: Boolean(editActive),
      });

      setNotice("Details saved.");
      await loadLists({ keepSelection: true });
      await loadSelected(selectedId);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to save details");
    } finally {
      setBusy(false);
    }
  }

  // ✅ Upsert item (no duplicates) + enforce qty <= stock
  function upsertItem(invIdRaw, qtyRaw) {
    const invId = Number(invIdRaw);
    const qty = Number(qtyRaw);

    if (!invId || qty < 1) return;

    const inv = inventoryMap.get(invId);
    const stock = Number(inv?.stock?.total_quantity ?? 0);
    const name = inv?.name ?? `Item #${invId}`;

    // Enforce "works off inventory"
    if (qty > stock) {
      setError(`You only have ${stock} in stock for "${name}".`);
      return;
    }

    setError("");
    setDraftItems((prev) => {
      const idx = prev.findIndex((x) => x.inventory_item_id === invId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: qty, name };
        return copy;
      }
      return [...prev, { inventory_item_id: invId, name, quantity: qty }];
    });
  }

  function removeItem(invId) {
    setDraftItems((prev) => prev.filter((x) => x.inventory_item_id !== invId));
  }

  async function saveItems() {
    if (!selectedId) return;
    clearMessages();
    setBusy(true);

    try {
      await api.put(`/packages/${selectedId}/items`, {
        items: draftItems.map((x) => ({
          inventory_item_id: x.inventory_item_id,
          quantity: Number(x.quantity),
        })),
      });

      setNotice("Items saved.");
      await loadSelected(selectedId);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          JSON.stringify(e?.response?.data) ||
          e.message ||
          "Failed to save items"
      );
    } finally {
      setBusy(false);
    }
  }

  function resetItems() {
    if (!selected) return;
    setDraftItems(normalizePackageItems(selected));
    setNotice("Items reset (not saved).");
    setError("");
  }

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
      {/* LEFT */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Packages</h2>

        {error ? (
          <div style={{ background: "#fff3f3", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10, marginBottom: 10 }}>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div style={{ background: "#f3fff5", border: "1px solid #c9f2d0", padding: 10, borderRadius: 10, marginBottom: 10 }}>
            {notice}
          </div>
        ) : null}

        {/* Create */}
        <form onSubmit={createPackage} style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Package name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />
          <input
            placeholder="Description (optional)"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "Working..." : "Create package"}
          </button>
        </form>

        {/* List */}
        <div style={{ display: "grid", gap: 8 }}>
          {packages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: 10,
                border: selectedId === p.id ? "2px solid #333" : "1px solid #eee",
                background: selectedId === p.id ? "#fafafa" : "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>#{p.id}</div>
            </button>
          ))}
          {packages.length === 0 ? <div style={{ opacity: 0.7 }}>No packages yet.</div> : null}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        {!selectedId ? (
          <div style={{ opacity: 0.7 }}>Create or select a package.</div>
        ) : !selected ? (
          <div style={{ opacity: 0.7 }}>Loading package...</div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {/* Details */}
            <div>
              <h2 style={{ marginTop: 0 }}>Package details</h2>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Name</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Description</span>
                  <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                  />
                  <span style={{ fontSize: 14 }}>Active</span>
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={saveDetails} disabled={busy}>
                    {busy ? "Working..." : "Save details"}
                  </button>
                  <button type="button" onClick={() => loadSelected(selectedId)} disabled={busy}>
                    Reset
                  </button>

                  {/* Delete not implemented yet */}
                  <button
                    type="button"
                    disabled
                    title="Delete endpoint not implemented yet"
                    style={{ marginLeft: "auto", opacity: 0.5 }}
                  >
                    Delete (soon)
                  </button>
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ borderTop: "1px solid #eee", paddingTop: 14 }}>
              <h2 style={{ marginTop: 0 }}>Package items</h2>

              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>
                Add items below. Quantity cannot exceed your current stock. Click <b>Save items</b> to apply changes.
              </div>

              {/* Add row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px", gap: 10, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Inventory item</span>
                  <select value={addItemId} onChange={(e) => setAddItemId(e.target.value)}>
                    <option value="">Select item...</option>
                    {inventoryItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} (stock: {Number(it.stock?.total_quantity ?? 0)})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    Qty {addItemId ? `(max ${selectedAddStock})` : ""}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={addItemId ? (selectedAddStock || 1) : 1}
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  disabled={!addItemId || busy}
                  onClick={() => {
                    upsertItem(addItemId, addQty);
                    setAddItemId("");
                    setAddQty(1);
                  }}
                >
                  Add
                </button>
              </div>

              {/* Items list */}
              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 10 }}>
                {draftItems.length === 0 ? (
                  <div style={{ padding: 12, opacity: 0.7 }}>No items yet.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Item</th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee", width: 160 }}>Qty</th>
                        <th style={{ padding: 10, borderBottom: "1px solid #eee", width: 120 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {draftItems.map((x) => {
                        const stock = Number(inventoryMap.get(x.inventory_item_id)?.stock?.total_quantity ?? 0);

                        return (
                          <tr key={x.inventory_item_id}>
                            <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                              <div style={{ fontWeight: 600 }}>{x.name}</div>
                              <div style={{ fontSize: 12, opacity: 0.6 }}>
                                ID: {x.inventory_item_id} • Stock: {stock}
                              </div>
                            </td>
                            <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                              <input
                                type="number"
                                min="1"
                                max={stock || 1}
                                value={x.quantity}
                                onChange={(e) => upsertItem(x.inventory_item_id, e.target.value)}
                                style={{ width: 110 }}
                              />
                            </td>
                            <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                              <button type="button" onClick={() => removeItem(x.inventory_item_id)} disabled={busy}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={saveItems} disabled={busy || draftItems.length === 0}>
                  {busy ? "Working..." : "Save items"}
                </button>
                <button type="button" onClick={resetItems} disabled={busy}>
                  Reset items
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
