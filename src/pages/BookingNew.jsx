// src/pages/BookingNew.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { createBooking, previewBookingAvailability } from "../api/bookings";
import AvailabilityBreakdown from "../components/AvailabilityBreakdown";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BookingNew() {
  const nav = useNavigate();

  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [packageId, setPackageId] = useState("");

  const [packages, setPackages] = useState([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  // Addons
  const [addons, setAddons] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(true);
  const [addonsErr, setAddonsErr] = useState("");
  // selectedAddons: [{ addon_id: number, quantity: number }]
  const [selectedAddons, setSelectedAddons] = useState([]);

  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null);

  // Package-expanded requirements that backend expects
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      setLoadingPkgs(true);
      try {
        const res = await api.get("/packages");
        const list = res.data?.data ?? res.data;
        setPackages(Array.isArray(list) ? list : []);
      } catch (e) {
        const msg =
          e?.response?.data?.message ?? e?.message ?? "Failed to load packages";
        toast.error(msg);
        setPackages([]);
      } finally {
        setLoadingPkgs(false);
      }
    })();
  }, []);

  // Load addons
  useEffect(() => {
    (async () => {
      setLoadingAddons(true);
      setAddonsErr("");
      try {
        const res = await api.get("/addons");
        const list = res.data?.data ?? res.data;
        setAddons(Array.isArray(list) ? list : []);
      } catch (e) {
        const msg =
          e?.response?.data?.message ?? e?.message ?? "Failed to load addons";
        setAddonsErr(msg);
        setAddons([]);
        toast.error(msg);
      } finally {
        setLoadingAddons(false);
      }
    })();
  }, []);

  // Whenever package changes, fetch package details and derive items[]
  useEffect(() => {
    (async () => {
      setItems([]);
      setPreview(null);
      setErr("");

      if (!packageId) return;

      try {
        const res = await api.get(`/packages/${packageId}`);
        const pkg = res.data?.data ?? res.data;

        const rawItems =
          pkg?.items ??
          pkg?.package_items ??
          pkg?.packageItems ??
          pkg?.data?.items ??
          [];

        const mapped = (Array.isArray(rawItems) ? rawItems : [])
          .map((pi) => ({
            inventory_item_id:
              pi.inventory_item_id ??
              pi.inventoryItemId ??
              pi.item_id ??
              pi.inventory_item?.id,
            quantity: Number(pi.quantity ?? pi.qty ?? pi.required_quantity ?? 0),
          }))
          .filter((x) => Number.isFinite(x.inventory_item_id) && x.quantity > 0);

        setItems(mapped);

        if (mapped.length === 0) {
          toast.message("Package has no items", {
            description: "Add items to this package before creating a booking.",
          });
        }
      } catch (e) {
        const msg =
          e?.response?.data?.message ??
          e?.message ??
          "Failed to load package items";
        setErr(msg);
        toast.error(msg);
      }
    })();
  }, [packageId]);

  // If addons change, invalidate preview (forces re-check)
  useEffect(() => {
    setPreview(null);
  }, [selectedAddons]);

  const canCheck = useMemo(() => {
    return Boolean(startLocal && endLocal && packageId && items.length > 0);
  }, [startLocal, endLocal, packageId, items.length]);

  function toISO(local) {
    const d = new Date(local);
    return d.toISOString();
  }

  function toggleAddon(addonId, checked) {
    setErr("");
    setPreview(null);
    setSelectedAddons((prev) => {
      if (checked) {
        if (prev.some((a) => a.addon_id === addonId)) return prev;
        return [...prev, { addon_id: addonId, quantity: 1 }];
      }
      return prev.filter((a) => a.addon_id !== addonId);
    });
  }

  function setAddonQty(addonId, qtyRaw) {
    const qty = Number(qtyRaw);
    setErr("");
    setPreview(null);
    setSelectedAddons((prev) =>
      prev.map((a) =>
        a.addon_id === addonId
          ? { ...a, quantity: Number.isFinite(qty) && qty >= 1 ? qty : 1 }
          : a
      )
    );
  }

  async function onCheck() {
    if (checking || creating) return;

    setErr("");
    setPreview(null);

    if (!startLocal || !endLocal || !packageId) {
      setErr("Please choose start time, end time, and a package.");
      return;
    }

    if (items.length === 0) {
      setErr(
        "This package has no items (or they failed to load). Add items to the package first."
      );
      return;
    }

    const invalidAddon = selectedAddons.find(
      (a) => !a.addon_id || !Number.isFinite(a.quantity) || a.quantity < 1
    );
    if (invalidAddon) {
      setErr("Addon quantities must be 1 or more.");
      return;
    }

    setChecking(true);
    try {
      const payload = {
        start_at: toISO(startLocal),
        end_at: toISO(endLocal),
        package_id: Number(packageId),
        items,
        addons: selectedAddons,
      };

      const res = await previewBookingAvailability(payload);
      setPreview(res);

      if (res?.available) {
        toast.success("Available", {
          description: "No shortages detected for the selected dates.",
        });
      } else {
        toast.message("Not available", {
          description: "There are shortages. Review the breakdown below.",
        });
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? "Availability check failed";
      setErr(msg);
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  }

  async function onCreate() {
    if (creating || checking) return;

    setErr("");

    if (!preview?.available) {
      setErr("Booking is not available. Fix shortages or change dates.");
      toast.error("Booking not available", {
        description: "Run availability check and resolve shortages first.",
      });
      return;
    }

    setCreating(true);
    try {
      const payload = {
        start_at: toISO(startLocal),
        end_at: toISO(endLocal),
        package_id: Number(packageId),
        items,
        addons: selectedAddons,
      };

      const created = await createBooking(payload);
      const newId =
        created?.id ??
        created?.data?.id ??
        created?.booking?.id ??
        created?.data?.booking?.id;

      toast.success("Booking created");

      nav(newId ? `/bookings/${newId}` : "/bookings");
    } catch (e) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? "Create booking failed";
      setErr(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New booking"
        description="Choose dates, a package, optional addons, then check availability before confirming."
        right={
          <Button asChild variant="outline">
            <Link to="/bookings">Back</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Booking details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pkg">Package</Label>
              <select
                id="pkg"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                disabled={loadingPkgs}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a package…</option>
                {packages
                  .filter((p) => p.is_active !== false)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.id})
                    </option>
                  ))}
              </select>
              <div className="text-xs text-muted-foreground">
                Loaded package requirements:{" "}
                <span className="font-medium text-foreground">
                  {items.length}
                </span>{" "}
                item(s)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Addons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {addonsErr ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {addonsErr}
            </div>
          ) : null}

          {loadingAddons ? (
            <div className="text-sm text-muted-foreground">Loading addons…</div>
          ) : addons.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No addons available.
            </div>
          ) : (
            <div className="space-y-2">
              {addons.map((a) => {
                const selected = selectedAddons.find((x) => x.addon_id === a.id);
                const price = (Number(a.price_cents || 0) / 100).toFixed(2);

                return (
                  <div
                    key={a.id}
                    className="rounded-md border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!selected}
                        onChange={(e) => toggleAddon(a.id, e.target.checked)}
                      />
                      <div>
                        <div className="font-medium">
                          {a.name}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({a.pricing_type} • ${price})
                          </span>
                        </div>
                        {a.description ? (
                          <div className="text-sm text-muted-foreground">
                            {a.description}
                          </div>
                        ) : null}
                      </div>
                    </label>

                    <div className="flex items-center gap-2 md:justify-end">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        className="w-24"
                        disabled={!selected}
                        value={selected ? selected.quantity : 1}
                        onChange={(e) => setAddonQty(a.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Selected addons:{" "}
            <span className="font-medium text-foreground">
              {selectedAddons.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onCheck}
          disabled={!canCheck || checking || creating}
          variant="outline"
        >
          {checking ? "Checking…" : "Check availability"}
        </Button>

        <Button
          onClick={onCreate}
          disabled={!preview?.available || creating || checking}
          title={!preview ? "Run check first" : ""}
        >
          {creating ? "Creating…" : "Confirm booking"}
        </Button>
      </div>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Availability breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityBreakdown result={preview} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}