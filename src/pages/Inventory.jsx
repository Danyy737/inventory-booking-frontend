import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Boxes, Plus, RefreshCw, AlertTriangle, PackageMinus } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

function qtyOf(item) {
  return Number(item?.stock?.total_quantity ?? 0);
}

function QtyBadge({ qty }) {
  if (qty <= 0) return <Badge variant="destructive">Out</Badge>;
  if (qty <= LOW_STOCK_THRESHOLD) return <Badge variant="secondary">Low</Badge>;
  return <Badge>OK</Badge>;
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Create form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);

  // Search + filters
  const [q, setQ] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editQuantity, setEditQuantity] = useState(0);

  // Row delete loading
  const [deletingId, setDeletingId] = useState(null);

  async function fetchItems({ silent = false } = {}) {
    if (!silent) setErr("");
    setLoading(true);
    try {
      const res = await api.get("/inventory/items");
      const payload = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to load inventory items.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((sum, it) => sum + qtyOf(it), 0);
    const lowStock = items.filter((it) => {
      const q = qtyOf(it);
      return q > 0 && q <= LOW_STOCK_THRESHOLD;
    }).length;
    const outOfStock = items.filter((it) => qtyOf(it) <= 0).length;

    return { totalItems, totalUnits, lowStock, outOfStock };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();

    let base = [...items].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    if (query) {
      base = base.filter((it) => {
        const n = String(it.name || "").toLowerCase();
        const s = String(it.sku || "").toLowerCase();
        const id = String(it.id || "");
        return n.includes(query) || s.includes(query) || id.includes(query);
      });
    }

    if (onlyLowStock) {
      base = base.filter((it) => qtyOf(it) <= LOW_STOCK_THRESHOLD);
    }

    return base;
  }, [items, q, onlyLowStock]);

  async function createItem(e) {
    e.preventDefault();
    setErr("");

    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Name is required.");
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/inventory/items", {
        name: trimmed,
        sku: sku || null,
        total_quantity: Number(quantity),
      });

      const created = res?.data?.data ?? res?.data;
      toast.success("Item created");

      if (created && created.id) setItems((prev) => [created, ...prev]);
      else await fetchItems({ silent: true });

      setName("");
      setSku("");
      setQuantity(0);
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to create item.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setErr("");
    setEditingId(item.id);
    setEditName(item.name ?? "");
    setEditSku(item.sku ?? "");
    setEditQuantity(qtyOf(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSku("");
    setEditQuantity(0);
  }

  async function saveEdit(id) {
    setErr("");

    const trimmed = editName.trim();
    if (!trimmed) {
      setErr("Name is required.");
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch(`/inventory/items/${id}`, {
        name: trimmed,
        sku: editSku || null,
        total_quantity: Number(editQuantity),
      });

      const updated = res?.data?.data ?? res?.data;

      if (updated && updated.id) {
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  name: trimmed,
                  sku: editSku || null,
                  stock: {
                    ...(it.stock ?? {}),
                    total_quantity: Number(editQuantity),
                  },
                }
              : it
          )
        );
      }

      toast.success("Item updated");
      cancelEdit();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to update item.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    setErr("");
    setDeletingId(id);

    try {
      await api.delete(`/inventory/items/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Item deleted");
      if (editingId === id) cancelEdit();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        "Failed to delete item. It may be referenced by a package.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Create, edit, and manage your inventory items."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fetchItems()}
              disabled={loading || saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat title="Items" value={stats.totalItems} Icon={Boxes} />
        <MiniStat title="Total units" value={stats.totalUnits} Icon={PackageMinus} />
        <MiniStat title="Low stock" value={stats.lowStock} Icon={AlertTriangle} />
        <MiniStat title="Out of stock" value={stats.outOfStock} Icon={AlertTriangle} />
      </div>

      {/* Keep as fallback; toasts are primary */}
      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Create card */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Add item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createItem} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Folding chair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>SKU (optional)</Label>
                <Input
                  placeholder="e.g. CHAIR-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || !name.trim()} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {saving ? "Working..." : "Create item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setName("");
                    setSku("");
                    setQuantity(0);
                  }}
                  disabled={saving}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List card */}
        <Card className="lg:col-span-8">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Items</CardTitle>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="sm:w-64"
                  placeholder="Search name, sku, id…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button
                  type="button"
                  variant={onlyLowStock ? "default" : "outline"}
                  onClick={() => setOnlyLowStock((v) => !v)}
                >
                  Low stock
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Low stock is defined as ≤ {LOW_STOCK_THRESHOLD}. Out of stock is 0.
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "No items yet. Add your first inventory item."
                  : "No results for your filters."}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right w-[140px]">Qty</TableHead>
                      <TableHead className="w-[90px]">ID</TableHead>
                      <TableHead className="text-right w-[260px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredItems.map((item) => {
                      const isEditing = editingId === item.id;
                      const isDeleting = deletingId === item.id;
                      const qty = qtyOf(item);

                      if (isEditing) {
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                disabled={saving}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editSku}
                                onChange={(e) => setEditSku(e.target.value)}
                                disabled={saving}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                disabled={saving}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.id}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2 justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveEdit(item.id)}
                                  disabled={saving || !editName.trim()}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div>{item.name}</div>
                              <QtyBadge qty={qty} />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.sku || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">{qty}</TableCell>
                          <TableCell className="text-muted-foreground">{item.id}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(item)}
                                disabled={saving || isDeleting}
                              >
                                Edit
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={saving || isDeleting}
                                  >
                                    {isDeleting ? "Deleting…" : "Delete"}
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete “{item.name}”?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This cannot be undone. If this item is used in a
                                      package, deletion may be blocked.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteItem(item.id)}
                                      disabled={isDeleting}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {isDeleting ? "Deleting…" : "Confirm delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ title, value, Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
          <div className="h-9 w-9 rounded-xl border bg-muted/40 flex items-center justify-center">
            <Icon className="h-4 w-4 opacity-80" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}