// src/pages/Bookings.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cancelBooking, listBookings } from "../api/bookings";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyCancelId, setBusyCancelId] = useState(null);
  const [err, setErr] = useState("");

  const [filter, setFilter] = useState("upcoming");
  const [q, setQ] = useState(""); // id search

  async function load({ silent = false } = {}) {
    if (!silent) setErr("");
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
      const msg =
        e?.response?.data?.message ?? e?.message ?? "Failed to load bookings";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCancel(id) {
    if (busyCancelId) return;

    setBusyCancelId(id);
    try {
      await cancelBooking(id);
      toast.success(`Booking #${id} cancelled`);
      await load({ silent: true });
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Cancel failed";
      toast.error(msg);
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
      out = out.filter(
        (b) =>
          String(b?.status ?? "").toLowerCase() !== "cancelled" && !isCompleted(b)
      );
    } else if (filter === "completed") {
      out = out.filter(
        (b) =>
          String(b?.status ?? "").toLowerCase() !== "cancelled" && isCompleted(b)
      );
    } else if (filter === "cancelled") {
      out = out.filter(
        (b) => String(b?.status ?? "").toLowerCase() === "cancelled"
      );
    }

    // id search
    const query = q.trim();
    if (query) out = out.filter((b) => String(b.id).includes(query));

    return out;
  }, [rows, filter, q]);

  // calendar-style grouping by start date (local)
  const groupedDays = useMemo(() => {
    const map = new Map(); // key: YYYY-MM-DD -> bookings[]
    for (const b of filteredRows) {
      const key = dayKeyLocal(b?.start_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }

    // sort each day by start time asc
    for (const [k, arr] of map.entries()) {
      arr.sort(
        (a, b) =>
          (new Date(a.start_at).getTime() || 0) - (new Date(b.start_at).getTime() || 0)
      );
      map.set(k, arr);
    }

    // sort day keys asc
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? -1 : 1));
    return keys.map((k) => ({ dayKey: k, label: dayLabelFromKey(k), items: map.get(k) }));
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Calendar-style agenda view. Cancelling is blocked once a booking has started."
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              Refresh
            </Button>
            <Button asChild>
              <Link to="/bookings/new">New booking</Link>
            </Button>
          </div>
        }
      />

      {/* insight cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat label="Total" value={counts.total} />
        <MiniStat label="Upcoming" value={counts.upcoming} />
        <MiniStat label="Completed" value={counts.completed} />
        <MiniStat label="Cancelled" value={counts.cancelled} />
      </div>

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Agenda</CardTitle>

            <Input
              className="md:w-64"
              placeholder="Search by booking ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* filter tabs */}
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

        <CardContent className="space-y-5">
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
            <div className="space-y-6">
              {groupedDays.map((group) => (
                <div key={group.dayKey} className="space-y-2">
                  {/* day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{group.label}</div>
                      <Badge variant="secondary">{group.items.length}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{group.dayKey}</div>
                  </div>

                  {/* events */}
                  <div className="space-y-2">
                    {group.items.map((b) => {
                      const statusLabel = getDisplayStatus(b);
                      const cancellable = isCancellable(b);
                      const cancelling = busyCancelId === b.id;

                      const timeRange = `${fmtTime(b.start_at)} — ${fmtTime(b.end_at)}`;
                      const duration = fmtDuration(b.start_at, b.end_at);

                      return (
                        <div
                          key={b.id}
                          className="group rounded-xl border bg-card px-4 py-3 transition hover:bg-muted/30 hover:border-border"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {/* left: calendar event feel */}
                            <button
                              type="button"
                              onClick={() => nav(`/bookings/${b.id}`)}
                              className="text-left flex-1"
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-semibold">Booking #{b.id}</div>
                                <StatusBadge status={statusLabel} />
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{timeRange}</span>
                                <span>•</span>
                                <span>{duration}</span>
                              </div>
                            </button>

                            {/* right actions */}
                            <div
                              className="flex items-center gap-2 md:justify-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/bookings/${b.id}`}>View</Link>
                              </Button>

                              {cancellable ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={busyCancelId !== null && !cancelling}
                                    >
                                      {cancelling ? "Cancelling…" : "Cancel"}
                                    </Button>
                                  </AlertDialogTrigger>

                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Cancel booking #{b.id}?
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
                                        onClick={() => onCancel(b.id)}
                                        disabled={cancelling}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {cancelling ? "Cancelling…" : "Confirm cancel"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function MiniStat({ label, value }) {
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

/* ---------- date helpers ---------- */

function dayKeyLocal(iso) {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabelFromKey(key) {
  if (!key || key === "Unknown") return "Unknown day";
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(startIso, endIso) {
  const a = new Date(startIso);
  const b = new Date(endIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";

  const mins = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* ---------- status helpers ---------- */

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