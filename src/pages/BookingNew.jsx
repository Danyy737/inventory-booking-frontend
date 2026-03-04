// src/pages/BookingNew.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { createBooking, previewBookingAvailability } from "../api/bookings";
import AvailabilityBreakdown from "../components/AvailabilityBreakdown";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { Calendar, Clock, Package, PlusCircle, CheckCircle2, AlertTriangle } from "lucide-react";

function centsToDollars(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function fmtLocal(isoOrLocal) {
  if (!isoOrLocal) return "—";
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return String(isoOrLocal);
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(startLocal, endLocal) {
  if (!startLocal || !endLocal) return "—";
  const s = new Date(startLocal);
  const e = new Date(endLocal);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const ms = e.getTime() - s.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const mins = Math.round(ms / 60000);
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours <= 0) return `${mins}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

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
        const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load packages";
        toast.error(msg);
        setPackages([]);
      } finally {
        setLoadingPkgs(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingAddons(true);
      setAddonsErr("");
      try {
        const res = await api.get("/addons");
        const list = res.data?.data ?? res.data;
        setAddons(Array.isArray(list) ? list : []);
      } catch (e) {
        const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load addons";
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
        const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load package items";
        setErr(msg);
        toast.error(msg);
      }
    })();
  }, [packageId]);

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

  const selectedAddonsCount = selectedAddons.length;

  const selectedAddonsValue = useMemo(() => {
    // estimation only (depends on backend pricing rules)
    const byId = new Map(addons.map((a) => [a.id, a]));
    let total = 0;
    for (const s of selectedAddons) {
      const a = byId.get(s.addon_id);
      if (!a) continue;
      const unit = Number(a.price_cents || 0);
      const qty = Number(s.quantity || 1);
      total += unit * qty;
    }
    return total;
  }, [addons, selectedAddons]);

  const selectedPackage = useMemo(() => {
    const idNum = Number(packageId);
    return packages.find((p) => p.id === idNum) ?? null;
  }, [packages, packageId]);

  const summary = useMemo(() => {
    return {
      start: startLocal ? fmtLocal(startLocal) : "—",
      end: endLocal ? fmtLocal(endLocal) : "—",
      duration: durationLabel(startLocal, endLocal),
      pkgName: selectedPackage?.name ?? "—",
      pkgItems: items.length,
      addons: selectedAddonsCount,
      addonsPrice: `$${centsToDollars(selectedAddonsValue)}`,
    };
  }, [startLocal, endLocal, selectedPackage?.name, items.length, selectedAddonsCount, selectedAddonsValue]);

  async function onCheck() {
    if (checking || creating) return;

    setErr("");
    setPreview(null);

    if (!startLocal || !endLocal || !packageId) {
      setErr("Please choose start time, end time, and a package.");
      toast.error("Missing fields", { description: "Choose dates and a package." });
      return;
    }

    if (items.length === 0) {
      setErr("This package has no items (or they failed to load). Add items to the package first.");
      toast.error("Package has no items");
      return;
    }

    const invalidAddon = selectedAddons.find(
      (a) => !a.addon_id || !Number.isFinite(a.quantity) || a.quantity < 1
    );
    if (invalidAddon) {
      setErr("Addon quantities must be 1 or more.");
      toast.error("Invalid addon quantity");
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
      const msg = e?.response?.data?.message ?? e?.message ?? "Availability check failed";
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
      const msg = e?.response?.data?.message ?? e?.message ?? "Create booking failed";
      setErr(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  const previewBadge = preview
    ? preview.available
      ? { icon: CheckCircle2, text: "Available", variant: "default" }
      : { icon: AlertTriangle, text: "Shortages", variant: "secondary" }
    : null;

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

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: form */}
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Booking details</CardTitle>
              <div className="text-sm text-muted-foreground">
                Select dates and a package. Requirements load automatically.
              </div>
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

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Loaded requirements:{" "}
                      <span className="font-medium text-foreground">{items.length}</span> item(s)
                    </span>
                    {previewBadge ? (
                      <>
                        <span className="opacity-50">•</span>
                        <Badge variant={previewBadge.variant}>
                          <previewBadge.icon className="h-3.5 w-3.5 mr-1" />
                          {previewBadge.text}
                        </Badge>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <Separator />

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Addons</CardTitle>
              <div className="text-sm text-muted-foreground">
                Optional extras that can reserve inventory and add pricing.
              </div>
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
                <div className="text-sm text-muted-foreground">No addons available.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {addons.map((a) => {
                    const selected = selectedAddons.find((x) => x.addon_id === a.id);
                    const price = centsToDollars(a.price_cents || 0);

                    return (
                      <div
                        key={a.id}
                        className={[
                          "rounded-xl border p-4 transition",
                          selected ? "bg-muted/30 border-border" : "hover:bg-muted/20",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={!!selected}
                              onChange={(e) => toggleAddon(a.id, e.target.checked)}
                            />
                            <div>
                              <div className="font-medium">{a.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {a.pricing_type} • ${price}
                              </div>
                              {a.description ? (
                                <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {a.description}
                                </div>
                              ) : null}
                            </div>
                          </label>

                          <div className="shrink-0">
                            <Badge variant={selected ? "default" : "secondary"}>
                              <PlusCircle className="h-3.5 w-3.5 mr-1" />
                              Add
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">Quantity</div>
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

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Selected addons:{" "}
                  <span className="font-medium text-foreground">{selectedAddonsCount}</span>
                </span>
                <span>
                  Est. addon value:{" "}
                  <span className="font-medium text-foreground">
                    ${centsToDollars(selectedAddonsValue)}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          {preview ? (
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle>Availability breakdown</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Review shortages before confirming.
                </div>
              </CardHeader>
              <CardContent>
                <AvailabilityBreakdown result={preview} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right: summary */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="space-y-1">
              <CardTitle>Summary</CardTitle>
              <div className="text-sm text-muted-foreground">
                Quick review before you confirm.
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <SummaryRow icon={Calendar} label="Start" value={summary.start} />
              <SummaryRow icon={Calendar} label="End" value={summary.end} />
              <SummaryRow icon={Clock} label="Duration" value={summary.duration} />
              <SummaryRow icon={Package} label="Package" value={summary.pkgName} />
              <SummaryRow icon={ListDot} label="Req. items" value={`${summary.pkgItems}`} />
              <SummaryRow icon={PlusCircle} label="Addons" value={`${summary.addons}`} />

              <Separator />

              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Est. addon total</div>
                <div className="font-medium">{summary.addonsPrice}</div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
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
                >
                  {creating ? "Creating…" : "Confirm booking"}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Tip: always run availability check before confirming.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// small helper icon because lucide has no "ListDot" exact; we emulate via SVG to avoid extra deps
function ListDot(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-4 w-4 opacity-80", props.className].filter(Boolean).join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="7" r="1" />
      <circle cx="6" cy="12" r="1" />
      <circle cx="6" cy="17" r="1" />
      <path d="M10 7h10" />
      <path d="M10 12h10" />
      <path d="M10 17h10" />
    </svg>
  );
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-8 w-8 rounded-xl border bg-muted/30 flex items-center justify-center">
          <Icon className="h-4 w-4 opacity-80" />
        </div>
        <div>{label}</div>
      </div>
      <div className="text-right font-medium">{value}</div>
    </div>
  );
}