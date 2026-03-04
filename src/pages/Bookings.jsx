// src/pages/Bookings.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cancelBooking, listBookings } from "../api/bookings";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Bookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listBookings();
      const list = Array.isArray(data) ? data : [];

      // Optional: sort upcoming first, then past, then cancelled
      const sorted = [...list].sort((a, b) => {
        const aKey = sortKey(a);
        const bKey = sortKey(b);
        if (aKey !== bKey) return aKey - bKey;

        // Within group: soonest first for upcoming, most recent first for past
        const aStart = new Date(a.start_at).getTime() || 0;
        const bStart = new Date(b.start_at).getTime() || 0;
        return aKey === 0 ? aStart - bStart : bStart - aStart;
      });

      setRows(sorted);
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message ?? e?.message ?? "Cancel failed");
    }
  }

  const counts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;

    for (const b of rows) {
      const raw = String(b?.status ?? "").toLowerCase();
      if (raw === "cancelled") cancelled++;
      else if (isCompleted(b)) completed++;
      else upcoming++;
    }

    return { upcoming, completed, cancelled, total: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Create and manage bookings. Cancelling is blocked once a booking has started."
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button asChild>
              <Link to="/bookings/new">New booking</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Total: {counts.total}</Badge>
        <Badge variant="secondary">Upcoming: {counts.upcoming}</Badge>
        <Badge variant="secondary">Completed: {counts.completed}</Badge>
        <Badge variant="secondary">Cancelled: {counts.cancelled}</Badge>
      </div>

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All bookings</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center justify-between gap-4">
              <div>No bookings yet.</div>
              <Button asChild>
                <Link to="/bookings/new">Create your first booking</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[220px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((b) => {
                    const statusLabel = getDisplayStatus(b);
                    const cancellable = isCancellable(b);
                    const meta =
                      String(b.status).toLowerCase() === "cancelled"
                        ? "—"
                        : isCompleted(b)
                        ? "Completed"
                        : isStarted(b)
                        ? "Started"
                        : "Upcoming";

                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.id}</TableCell>
                        <TableCell>{fmt(b.start_at)}</TableCell>
                        <TableCell>{fmt(b.end_at)}</TableCell>
                        <TableCell>
                          <StatusBadge status={statusLabel} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/bookings/${b.id}`}>View</Link>
                            </Button>

                            {cancellable ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onCancel(b.id)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{meta}</span>
                            )}
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
 * - else use backend status (likely confirmed)
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

/**
 * Your backend blocks cancelling past/started bookings.
 * We match that rule:
 * - must not be cancelled
 * - must not be started
 */
function isCancellable(b) {
  const raw = String(b?.status ?? "").toLowerCase();
  if (raw === "cancelled") return false;
  if (isStarted(b)) return false;
  return true;
}

/**
 * Sorting:
 * 0 = upcoming & active
 * 1 = past & active
 * 2 = cancelled
 */
function sortKey(b) {
  const raw = String(b?.status ?? "").toLowerCase();
  if (raw === "cancelled") return 2;
  if (isCompleted(b)) return 1;
  return 0;
}