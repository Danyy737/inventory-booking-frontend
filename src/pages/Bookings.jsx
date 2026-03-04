// src/pages/Bookings.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cancelBooking, listBookings } from "../api/bookings";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default function Bookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyCancelId, setBusyCancelId] = useState(null);
  const [err, setErr] = useState("");

  const [filter, setFilter] = useState("upcoming");
  const [q, setQ] = useState(""); // id search

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listBookings();
      const list = Array.isArray(data) ? data : [];

      const sorted = [...list].sort((a, b) => {
        const aKey = sortKey(a);
        const bKey = sortKey(b);
        if (aKey !== bKey) return aKey - bKey;

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

    setBusyCancelId(id);
    try {
      await cancelBooking(id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message ?? e?.message ?? "Cancel failed");
    } finally {
      setBusyCancelId(null);
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

  const filteredRows = useMemo(() => {
    let out = rows;

    // filter bucket
    if (filter === "upcoming") {
      out = out.filter((b) => String(b?.status ?? "").toLowerCase() !== "cancelled" && !isCompleted(b));
    } else if (filter === "completed") {
      out = out.filter((b) => String(b?.status ?? "").toLowerCase() !== "cancelled" && isCompleted(b));
    } else if (filter === "cancelled") {
      out = out.filter((b) => String(b?.status ?? "").toLowerCase() === "cancelled");
    }

    // id search
    const query = q.trim();
    if (query) out = out.filter((b) => String(b.id).includes(query));

    return out;
  }, [rows, filter, q]);

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

      {/* Insight cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Upcoming" value={counts.upcoming} />
        <StatCard label="Completed" value={counts.completed} />
        <StatCard label="Cancelled" value={counts.cancelled} />
      </div>

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Manage bookings</CardTitle>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                className="sm:w-56"
                placeholder="Search by booking ID…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                type="button"
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <Separator />
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title={rows.length === 0 ? "No bookings yet" : "No results"}
              subtitle={
                rows.length === 0
                  ? "Create your first booking to start reserving inventory."
                  : "Try another filter or clear the search."
              }
              primary={
                <Button asChild>
                  <Link to="/bookings/new">Create booking</Link>
                </Button>
              }
              secondary={
                rows.length === 0 ? null : (
                  <Button variant="outline" onClick={() => setQ("")}>
                    Clear search
                  </Button>
                )
              }
            />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">ID</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[240px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.map((b) => {
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

                    const cancelling = busyCancelId === b.id;

                    return (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">#{b.id}</TableCell>
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
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="sm">
        Cancel
      </Button>
    </AlertDialogTrigger>

    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel booking #{b.id}?</AlertDialogTitle>
        <AlertDialogDescription>
          This will release all reserved inventory for this booking.
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel>Keep booking</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => onCancel(b.id)}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Confirm cancel
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
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

function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, subtitle, primary, secondary }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex gap-2">
        {secondary}
        {primary}
      </div>
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

function sortKey(b) {
  const raw = String(b?.status ?? "").toLowerCase();
  if (raw === "cancelled") return 2;
  if (isCompleted(b)) return 1;
  return 0;
}