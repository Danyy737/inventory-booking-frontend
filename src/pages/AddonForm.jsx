// src/pages/AddonForm.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function toIntOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function dollarsToCents(dollars) {
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
    const validItems = items.filter(
      (it) => String(it.inventory_item_id).trim() !== "" && toIntOrZero(it.quantity_per_unit) > 0
    );
    return validItems.length > 0;
  }, [name, pricingType, items]);

  async function loadInventory() {
    const res = await api.get("/inventory/items");
    setInventoryOptions(res.data?.data ?? []);
  }

  async function loadAddon(addonId) {
    try {
      const res = await api.get(`/addons/${addonId}`);
      return res.data?.data ?? res.data;
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
        setErr(e?.response?.data?.message ?? e?.message ?? "Failed to load addon form.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
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
      if (isEdit) await api.put(`/addons/${id}`, payload);
      else await api.post("/addons", payload);

      navigate("/addons");
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if (status === 403) {
        setErr("Admin only: you don’t have permission to create or edit addons.");
      } else if (status === 422) {
        const msg = data?.message || "Validation failed. Check required fields and try again.";
        const firstFieldError = data?.errors ? Object.values(data.errors).flat()?.[0] : null;
        setErr(firstFieldError ? `${msg} (${firstFieldError})` : msg);
      } else {
        setErr(data?.message ?? e?.message ?? "Save failed.");
      }
    } finally {
      setSaving(false);
    }
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
        title={isEdit ? "Edit addon" : "Create addon"}
        description="Addons can reserve one or more inventory items per unit and add pricing to bookings."
        right={
          <Button asChild variant="outline">
            <Link to="/addons">Back</Link>
          </Button>
        }
      />

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Addon details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Extra Chairs" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Pricing type</Label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="per_unit">per_unit</option>
                <option value="fixed">fixed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Price (AUD)</Label>
              <Input
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 5.00"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
              <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" variant="outline" onClick={addItemRow}>
              + Add item
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Tip: Addons can include multiple inventory items (e.g., chairs + tables per unit).
            </div>

            <Separator />

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inventory item</TableHead>
                    <TableHead className="w-[180px]">Qty / Unit</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <select
                          value={it.inventory_item_id}
                          onChange={(e) => updateItem(idx, { inventory_item_id: e.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select…</option>
                          {inventoryOptions.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      <TableCell>
                        <Input
                          value={it.quantity_per_unit}
                          onChange={(e) => updateItem(idx, { quantity_per_unit: e.target.value })}
                          inputMode="numeric"
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length === 1}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!canSave ? (
              <div className="text-xs text-muted-foreground">
                Required: name + at least 1 item with inventory + qty &gt; 0.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSave || saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create addon"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/addons")} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}