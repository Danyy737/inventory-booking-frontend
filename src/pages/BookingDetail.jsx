// src/pages/BookingDetail.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelBooking, getBooking, getPackingList } from "../api/bookings";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [booking, setBooking] = useState(null);

  const [packingLoading, setPackingLoading] = useState(false);
  const [packing, setPacking] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await getBooking(bookingId);
      setBooking(data);
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Failed to load booking");
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
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message ?? e?.message ?? "Cancel failed");
    }
  }

  async function onLoadPacking() {
    setPackingLoading(true);
    try {
      const data = await getPackingList(bookingId);
      setPacking(data);
    } catch (e) {
      alert(e?.response?.data?.message ?? e?.message ?? "Failed to load packing list");
    } finally {
      setPackingLoading(false);
    }
  }

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

  const rawStatus = String(booking?.status || "").toLowerCase();
  const displayStatus = getDisplayStatus(booking);
  const cancellable = isCancellable(booking);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Booking #${booking?.id ?? bookingId}`}
        description="View booking details, reserved items, and packing list."
        right={
          <Button asChild variant="outline">
            <Link to="/bookings">Back</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <div className="text-muted-foreground">Start (local):</div>
              <div className="font-medium">{fmt(booking?.start_at)}</div>
            </div>

            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <div className="text-muted-foreground">End (local):</div>
              <div className="font-medium">{fmt(booking?.end_at)}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="text-muted-foreground">Status:</div>
              <StatusBadge status={displayStatus} />
            </div>

            <div className="pt-2">
              {cancellable ? (
                <Button variant="destructive" onClick={onCancel}>
                  Cancel booking
                </Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Packing list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onLoadPacking} disabled={packingLoading} className="w-full">
              {packingLoading ? "Loading…" : "Load packing list"}
            </Button>

            {packing ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">Packing checklist</div>

                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {(packing.packing_list || []).map((it) => (
                    <li key={it.inventory_item_id}>
                      <span className="font-medium text-foreground">
                        {it.required_quantity}×
                      </span>{" "}
                      {it.name}
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Summary:</span>{" "}
                  {packing.summary?.unique_items ?? (packing.packing_list || []).length} unique items ·{" "}
                  {packing.summary?.total_units ?? "—"} total units
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

      <Card>
        <CardHeader>
          <CardTitle>Reserved items</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservedItems booking={booking} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReservedItems({ booking }) {
  const reservations = booking?.reservations ?? booking?.inventory_reservations ?? booking?.items ?? [];

  if (!Array.isArray(reservations) || reservations.length === 0) {
    return <div className="text-sm text-muted-foreground">No reservation breakdown returned.</div>;
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
              <TableRow key={r.id ?? `${itemId}-${idx}`}>
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

/**
 * Frontend-only derived status:
 * - cancelled stays cancelled
 * - if end_at is in the past => completed
 * - else use backend status
 */
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
  if (isStarted(b)) return false; // matches your backend rule
  return true;
}