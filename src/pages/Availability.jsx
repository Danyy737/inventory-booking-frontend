import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Availability Page (MVP)
 * Uses your real backend routes:
 * - GET  /inventory/items
 * - GET  /packages
 * - POST /bookings/preview-availability
 *
 * Notes:
 * - This page is just a checker. It does NOT create a booking.
 * - Optional "Create booking" button navigates to /bookings/new with prefilled state.
 */

function toLocalInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toISOFromLocalInput(localValue) {
  if (!localValue) return null;
  const d = new Date(localValue);
  return d.toISOString();
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export default function Availability() {
  const navigate = useNavigate();

  // Defaults: now -> +2 hours
  const [startAtLocal, setStartAtLocal] = useState(() => toLocalInputValue(new Date()));
  const [endAtLocal, setEndAtLocal] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return toLocalInputValue(d);
  });

  const [inventoryOptions, setInventoryOptions] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);

  // each line: { type: "item"|"package", id: "", quantity: 1 }
  const [lines, setLines] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null); // normalized

  const startISO = useMemo(() => toISOFromLocalInput(startAtLocal), [startAtLocal]);
  const endISO = useMemo(() => toISOFromLocalInput(endAtLocal), [endAtLocal]);

  // Load dropdown options
  useEffect(() => {
    let mounted = true;

    async function load() {
      setErr("");
      setLoadingOptions(true);
      try {
        const [invRes, pkgRes] = await Promise.all([api.get("/inventory/items"), api.get("/packages")]);

        const inv = invRes?.data?.data ?? invRes?.data ?? [];
        const pkgs = pkgRes?.data?.data ?? pkgRes?.data ?? [];

        if (!mounted) return;
        setInventoryOptions(Array.isArray(inv) ? inv : []);
        setPackageOptions(Array.isArray(pkgs) ? pkgs : []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load inventory/packages.");
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function addLine(type) {
    setResult(null);
    setLines((prev) => [...prev, { type, id: "", quantity: 1 }]);
  }

  function updateLine(idx, patch) {
    setResult(null);
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx) {
    setResult(null);
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const payload = useMemo(() => {
    const items = lines
      .filter((l) => l.type === "item" && l.id)
      .map((l) => ({
        inventory_item_id: safeNum(l.id),
        quantity: safeNum(l.quantity),
      }))
      .filter((x) => x.inventory_item_id > 0 && x.quantity > 0);

    const packages = lines
      .filter((l) => l.type === "package" && l.id)
      .map((l) => ({
        package_id: safeNum(l.id),
        quantity: safeNum(l.quantity),
      }))
      .filter((x) => x.package_id > 0 && x.quantity > 0);

    return {
      start_at: startISO,
      end_at: endISO,
      items,
      packages,
    };
  }, [lines, startISO, endISO]);

  const canCheck = useMemo(() => {
    if (!payload.start_at || !payload.end_at) return false;
    const s = new Date(payload.start_at).getTime();
    const e = new Date(payload.end_at).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return false;
    if (payload.items.length === 0 && payload.packages.length === 0) return false;
    return true;
  }, [payload]);

  function normalizePreviewResponse(raw) {
    const data = raw?.data ?? raw;

    const ok = Boolean(
      data?.ok ??
        data?.available ??
        data?.is_available ??
        data?.availability?.ok ??
        data?.availability?.available
    );

    const requirements =
      data?.requirements ??
      data?.items ??
      data?.availability?.requirements ??
      data?.availability?.items ??
      data?.breakdown ??
      data?.shortages ??
      [];

    const normalizedRows = Array.isArray(requirements)
      ? requirements.map((r) => ({
          inventory_item_id: r.inventory_item_id ?? r.id ?? null,
          name: r.name ?? r.inventory_item_name ?? r.item_name ?? null,
          required: r.required ?? r.required_quantity ?? r.qty_required ?? r.requested ?? r.quantity ?? 0,
          available: r.available ?? r.available_quantity ?? r.qty_available ?? r.on_hand ?? r.remaining ?? 0,
          shortage: r.shortage ?? r.shortage_quantity ?? r.qty_short ?? r.missing ?? 0,
          _raw: r,
        }))
      : [];

    const inferredOk =
      (data?.ok ?? data?.available ?? data?.is_available) != null
        ? ok
        : normalizedRows.every((r) => safeNum(r.shortage) <= 0);

    return {
      ok: inferredOk,
      requirements: normalizedRows,
      raw: data,
    };
  }

  async function checkAvailability() {
    setErr("");
    setChecking(true);
    setResult(null);

    try {
      const res = await api.post("/bookings/preview-availability", payload);
      const normalized = normalizePreviewResponse(res?.data);
      setResult(normalized);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if ((status === 409 || status === 422) && data) {
        const normalized = normalizePreviewResponse(data);
        normalized.ok = false;
        setResult(normalized);
      } else {
        setErr(e?.response?.data?.message || e.message || "Availability check failed.");
      }
    } finally {
      setChecking(false);
    }
  }

  function goToCreateBooking() {
    navigate("/bookings/new", {
      state: {
        start_at: payload.start_at,
        end_at: payload.end_at,
        items: payload.items,
        packages: payload.packages,
      },
    });
  }

  const statusText = useMemo(() => {
    if (!result) return "";
    return result.ok ? "Available" : "Not available (shortages found)";
  }, [result]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="Check if items/packages can be booked for a time window before creating a booking."
        right={
          <Button variant="outline" onClick={checkAvailability} disabled={!canCheck || checking}>
            {checking ? "Checking…" : "Check availability"}
          </Button>
        }
      />

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Time window</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startAtLocal}
              onChange={(e) => setStartAtLocal(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endAtLocal}
              onChange={(e) => setEndAtLocal(e.target.value)}
            />
          </div>

          {!canCheck ? (
            <div className="md:col-span-2 text-xs text-muted-foreground">
              Add dates + at least one requested line (and ensure end &gt; start).
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Requested</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => addLine("item")} disabled={loadingOptions}>
              + Add inventory item
            </Button>
            <Button type="button" variant="outline" onClick={() => addLine("package")} disabled={loadingOptions}>
              + Add package
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Lines: <span className="font-medium text-foreground">{lines.length}</span>
            </div>
            {loadingOptions ? <span className="text-muted-foreground">Loading…</span> : null}
          </div>

          <Separator />

          {lines.length === 0 ? (
            <div className="text-sm text-muted-foreground">Add items or packages above.</div>
          ) : (
            <div className="space-y-2">
              {lines.map((l, idx) => {
                const isItem = l.type === "item";
                const options = isItem ? inventoryOptions : packageOptions;

                return (
                  <div key={idx} className="rounded-md border p-3">
                    <div className="grid gap-3 md:grid-cols-12 md:items-end">
                      <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground mb-2">Type</div>
                        <Badge variant="secondary">{isItem ? "Item" : "Package"}</Badge>
                      </div>

                      <div className="md:col-span-7 space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {isItem ? "Inventory item" : "Package"}
                        </Label>
                        <select
                          value={l.id}
                          onChange={(e) => updateLine(idx, { id: e.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select {isItem ? "item" : "package"}…</option>
                          {options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name ?? o.title ?? `#${o.id}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={l.quantity}
                          onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-1 flex md:justify-end">
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeLine(idx)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" onClick={checkAvailability} disabled={!canCheck || checking}>
              {checking ? "Checking…" : "Check availability"}
            </Button>
            {!canCheck ? (
              <span className="text-xs text-muted-foreground">Fill dates + add at least one line.</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Result</CardTitle>
            <Badge variant={result.ok ? "default" : "destructive"}>{statusText}</Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {result.requirements.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No breakdown returned by the API. If your preview response uses different keys, paste it and we’ll map it.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inventory Item</TableHead>
                      <TableHead className="text-right w-[140px]">Required</TableHead>
                      <TableHead className="text-right w-[140px]">Available</TableHead>
                      <TableHead className="text-right w-[140px]">Shortage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.requirements.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {r.name || (r.inventory_item_id ? `Item #${r.inventory_item_id}` : "Item")}
                        </TableCell>
                        <TableCell className="text-right">{safeNum(r.required)}</TableCell>
                        <TableCell className="text-right">{safeNum(r.available)}</TableCell>
                        <TableCell className="text-right">{safeNum(r.shortage)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={goToCreateBooking} disabled={!result.ok}>
                Create booking
              </Button>
              <span className="text-xs text-muted-foreground">
                {result.ok
                  ? "Looks good — you can create the booking confidently."
                  : "Fix shortages or change dates to enable booking."}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}