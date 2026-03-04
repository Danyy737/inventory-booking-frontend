import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  // Search/filter in left list
  const [q, setQ] = useState("");

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

  const filteredPackages = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return packages;
    return packages.filter((p) => {
      const n = String(p.name || "").toLowerCase();
      const id = String(p.id || "");
      return n.includes(query) || id.includes(query);
    });
  }, [packages, q]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  async function loadLists({ keepSelection = true } = {}) {
    clearMessages();
    setLoading(true);
    try {
      const [pkgRes, invRes] = await Promise.all([api.get("/packages"), api.get("/inventory/items")]);

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
      setError(e?.response?.data?.message || JSON.stringify(e?.response?.data) || e.message || "Failed to save items");
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Build packages from inventory items. Package quantities cannot exceed current stock."
        right={
          <Button variant="outline" onClick={() => loadLists({ keepSelection: true })} disabled={busy}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* LEFT */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create package</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPackage} className="space-y-3">
                <div className="space-y-2">
                  <Label>Package name</Label>
                  <Input value={createName} onChange={(e) => setCreateName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? "Working..." : "Create package"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>All packages</CardTitle>
                <Badge variant="secondary">{packages.length}</Badge>
              </div>
              <Input placeholder="Search packages…" value={q} onChange={(e) => setQ(e.target.value)} />
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredPackages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No packages yet.</div>
              ) : (
                filteredPackages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={[
                      "w-full text-left rounded-md border px-3 py-2 transition",
                      selectedId === p.id ? "bg-muted border-border" : "hover:bg-muted/60",
                    ].join(" ")}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">#{p.id}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedId ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Create or select a package.</CardContent>
            </Card>
          ) : !selected ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Loading package…</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Package details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        Active
                      </label>
                      <Badge variant={editActive ? "default" : "secondary"}>{editActive ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={saveDetails} disabled={busy}>
                      {busy ? "Working..." : "Save details"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => loadSelected(selectedId)} disabled={busy}>
                      Reset
                    </Button>

                    <Button type="button" variant="outline" disabled title="Delete endpoint not implemented yet" className="ml-auto">
                      Delete (soon)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle>Package items</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Add items below. Quantity cannot exceed your current stock. Click <b>Save items</b> to apply changes.
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Add row */}
                  <div className="grid gap-3 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-7 space-y-2">
                      <Label>Inventory item</Label>
                      <select
                        value={addItemId}
                        onChange={(e) => setAddItemId(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select item...</option>
                        {inventoryItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (stock: {Number(it.stock?.total_quantity ?? 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <Label>
                        Qty {addItemId ? <span className="text-muted-foreground">(max {selectedAddStock})</span> : null}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max={addItemId ? (selectedAddStock || 1) : 1}
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        className="w-full"
                        disabled={!addItemId || busy}
                        onClick={() => {
                          upsertItem(addItemId, addQty);
                          setAddItemId("");
                          setAddQty(1);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Items list */}
                  {draftItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No items yet.</div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-[180px]">Qty</TableHead>
                            <TableHead className="w-[140px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {draftItems.map((x) => {
                            const stock = Number(inventoryMap.get(x.inventory_item_id)?.stock?.total_quantity ?? 0);

                            return (
                              <TableRow key={x.inventory_item_id}>
                                <TableCell>
                                  <div className="font-medium">{x.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {x.inventory_item_id} • Stock: {stock}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={stock || 1}
                                    value={x.quantity}
                                    onChange={(e) => upsertItem(x.inventory_item_id, e.target.value)}
                                    className="w-32"
                                  />
                                </TableCell>

                                <TableCell className="text-right">
                                  <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(x.inventory_item_id)} disabled={busy}>
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={saveItems} disabled={busy || draftItems.length === 0}>
                      {busy ? "Working..." : "Save items"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetItems} disabled={busy}>
                      Reset items
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}