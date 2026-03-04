// src/pages/BookingDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelBooking, getBooking, getPackingList } from "../api/bookings";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { Calendar, Clock, Package, ListChecks, RefreshCw } from "lucide-react";

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [booking, setBooking] = useState(null);

  const [cancelling, setCancelling] = useState(false);

  const [packingLoading, setPackingLoading] = useState(false);
  const [packing, setPacking] = useState(null);

  // local checklist state (frontend-only)
  const [checked, setChecked] = useState({});

  async function load({ silent = false } = {}) {
    if (!silent) setErr("");
    setLoading(true);
    try {
      const data = await getBooking(bookingId);
      setBooking(data);
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load booking";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(bookingId)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function onCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelBooking(bookingId);
      toast.success(`Booking #${bookingId} cancelled`);
      await load({ silent: true });
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Cancel failed";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  }

  async function onLoadPacking() {
    if (packingLoading) return;
    setPackingLoading(true);
    try {
      const data = await getPackingList(bookingId);
      setPacking(data);
      setChecked({}); // reset checklist when loading fresh list
      toast.success("Packing list loaded");
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load packing list";
      toast.error(msg);
    } finally {
      setPackingLoading(false);
    }
  }

  const displayStatus = getDisplayStatus(booking);
  const cancellable = isCancellable(booking);
  const rawStatus = String(booking?.status || "").toLowerCase();

  const reservations = useMemo(() => {
    const r =
      booking?.reservations ??
      booking?.inventory_reservations ??
      booking?.items ??
      [];
    return Array.isArray(r) ? r : [];
  }, [booking]);

  const reservedTotals = useMemo(() => {
    let totalUnits = 0;
    const uniqueIds = new Set();

    for (const r of reservations) {
      const itemId = r.inventory_item_id ?? r.item_id ?? r.inventoryItemId;
      const qty = Number(r.reserved_quantity ?? r.quantity ?? r.qty ?? 0);
      if (itemId != null) uniqueIds.add(String(itemId));
      if (Number.isFinite(qty)) totalUnits += qty;
    }

    return { totalUnits, uniqueItems: uniqueIds.size };
  }, [reservations]);

  const durationLabel = useMemo(() => {
    const start = booking?.start_at ? new Date(booking.start_at) : null;
    const end = booking?.end_at ? new Date(booking.end_at) : null;
    if (!start || !end) return "—";
    const ms = end.getTime() - start.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    const mins = Math.round(ms / 60000);
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hours <= 0) return `${mins}m`;
    if (rem === 0) return `${hours}h`;
    return `${hours}h ${rem}m`;
  }, [booking?.start_at, booking?.end_at]);

  // addons: support common shapes safely
  const addons = useMemo(() => {
    const a = booking?.addons ?? booking?.booking_addons ?? booking?.add_ons ?? [];
    return Array.isArray(a) ? a : [];
  }, [booking]);

  // packing summary
  const packingSummary = useMemo(() => {
    const list = packing?.packing_list ?? [];
    const unique = packing?.summary?.unique_items ?? (Array.isArray(list) ? list.length : 0);
    const units = packing?.summary?.total_units ?? "—";
    return { unique, units };
  }, [packing]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/bookings">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Booking #${booking?.id ?? bookingId}`}
        description="View booking details, reserved items, addons, and packing list."
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link to="/bookings">Back</Link>
            </Button>
          </div>
        }
      />

      {/* Top stats */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat title="Status" value={<StatusBadge status={displayStatus} />} Icon={Package} />
        <MiniStat title="Duration" value={durationLabel} Icon={Clock} />
        <MiniStat title="Reserved units" value={reservedTotals.totalUnits} Icon={ListChecks} />
        <MiniStat title="Unique items" value={reservedTotals.uniqueItems} Icon={Calendar} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle>Booking details</CardTitle>
            <div className="text-sm text-muted-foreground">
              Start and end times are shown in your local timezone.
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Start</div>
                <div className="mt-1 font-medium">{fmt(booking?.start_at)}</div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">End</div>
                <div className="mt-1 font-medium">{fmt(booking?.end_at)}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground">Status:</div>
              <StatusBadge status={displayStatus} />
            </div>

            {/* Addons (optional) */}
            {addons.length > 0 ? (
              <div className="rounded-xl border p-4">
                <div className="font-medium">Addons</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Addons attached to this booking (if your API returns them).
                </div>

                <div className="mt-3 space-y-2">
                  {addons.map((a, idx) => {
                    const name = a?.name ?? a?.addon?.name ?? "Addon";
                    const qty = a?.quantity ?? a?.qty ?? 1;
                    const id = a?.id ?? a?.addon_id ?? a?.addon?.id ?? idx;

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                      >
                        <div className="font-medium">{name}</div>
                        <Badge variant="secondary">Qty {qty}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Cancel area */}
            <div>
              {cancellable ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={cancelling}>
                      {cancelling ? "Cancelling…" : "Cancel booking"}
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Cancel booking #{booking?.id ?? bookingId}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will release all reserved inventory for this booking.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancelling}>
                        Keep booking
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onCancel}
                        disabled={cancelling}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {cancelling ? "Cancelling…" : "Confirm cancel"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  {rawStatus === "cancelled"
                    ? "This booking is cancelled."
                    : isCompleted(booking)
                    ? "This booking has ended and is marked as completed."
                    : "This booking has already started, so it can’t be cancelled."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Packing list */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Packing list</CardTitle>
            <div className="text-sm text-muted-foreground">
              Generate a checklist for pickup / dispatch.
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <Button
              onClick={onLoadPacking}
              disabled={packingLoading}
              className="w-full"
              variant={packing ? "outline" : "default"}
            >
              {packingLoading ? "Loading…" : packing ? "Refresh packing list" : "Load packing list"}
            </Button>

            {packing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Checklist</div>
                  <Badge variant="secondary">
                    {packingSummary.unique} items
                  </Badge>
                </div>

                <div className="space-y-2">
                  {(packing.packing_list || []).map((it) => {
                    const key = String(it.inventory_item_id);
                    const done = Boolean(checked[key]);

                    return (
                      <label
                        key={it.inventory_item_id}
                        className="flex items-start gap-3 rounded-lg border bg-muted/10 px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={done}
                          onChange={(e) =>
                            setChecked((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                        />
                        <div className="flex-1">
                          <div className={done ? "line-through opacity-70" : "font-medium"}>
                            {it.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Qty: <span className="font-medium text-foreground">{it.required_quantity}</span>
                          </div>
                        </div>
                        <Badge variant={done ? "default" : "secondary"}>
                          {it.required_quantity}×
                        </Badge>
                      </label>
                    );
                  })}
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Summary:</span>{" "}
                  {packingSummary.unique} unique items · {packingSummary.units} total units
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Load to generate a packing checklist for this booking.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reserved items */}
      <Card>
        <CardHeader>
          <CardTitle>Reserved items</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservedItems reservations={reservations} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReservedItems({ reservations }) {
  if (!Array.isArray(reservations) || reservations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No reservation breakdown returned.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="w-[120px]">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r, idx) => {
            const itemId = r.inventory_item_id ?? r.item_id ?? r.inventoryItemId;
            const qty = r.reserved_quantity ?? r.quantity ?? r.qty;
            const name = r.inventory_item?.name ?? r.item?.name ?? r.name;

            return (
              <TableRow key={r.id ?? `${itemId}-${idx}`} className="hover:bg-muted/40">
                <TableCell className="font-medium">
                  {name ? `${name} (#${itemId})` : `Item #${itemId}`}
                </TableCell>
                <TableCell>{qty}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
            <div className="mt-1 text-2xl font-semibold">
              {typeof value === "string" || typeof value === "number" ? value : value}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl border bg-muted/40 flex items-center justify-center">
            <Icon className="h-4 w-4 opacity-80" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "confirmed") return <Badge>Confirmed</Badge>;
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  if (s === "completed") return <Badge variant="secondary">Completed</Badge>;
  return <Badge variant="secondary">{status || "—"}</Badge>;
}

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);

  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayStatus(b) {
  const raw = String(b?.status ?? "");
  if (raw.toLowerCase() === "cancelled") return "Cancelled";
  if (isCompleted(b)) return "Completed";
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
  return "—";
}

function isCompleted(b) {
  if (!b?.end_at) return false;
  const end = new Date(b.end_at);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() <= Date.now();
}

function isStarted(b) {
  if (!b?.start_at) return false;
  const start = new Date(b.start_at);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() <= Date.now();
}

function isCancellable(b) {
  const raw = String(b?.status ?? "").toLowerCase();
  if (raw === "cancelled") return false;
  if (isStarted(b)) return false;
  return true;
}