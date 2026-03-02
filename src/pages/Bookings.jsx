// src/pages/Bookings.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelBooking, listBookings } from "../api/bookings";

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

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Bookings</h2>
        <Link to="/bookings/new">+ New booking</Link>
      </div>

      {err && <div style={{ marginTop: 10, color: "crimson" }}>{err}</div>}

      {loading ? (
        <div style={{ marginTop: 12 }}>Loading…</div>
      ) : (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Start</th>
                <th style={th}>End</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const statusLabel = getDisplayStatus(b);
                const cancellable = isCancellable(b);

                return (
                  <tr key={b.id}>
                    <td style={td}>{b.id}</td>
                    <td style={td}>{fmt(b.start_at)}</td>
                    <td style={td}>{fmt(b.end_at)}</td>
                    <td style={td}>
                      <StatusPill status={statusLabel} />
                    </td>
                    <td style={td}>
                      <Link to={`/bookings/${b.id}`}>View</Link>

                      {cancellable ? (
                        <>
                          {" "}
                          ·{" "}
                          <button onClick={() => onCancel(b.id)} style={btnLink}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span style={{ marginLeft: 10, color: "#777", fontSize: 13 }}>
                          {String(b.status).toLowerCase() === "cancelled"
                            ? "—"
                            : isCompleted(b)
                              ? "Completed"
                              : "Started"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td style={td} colSpan={5}>
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <button onClick={load}>Refresh</button>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const bg =
    s === "confirmed" ? "#e8fff0" :
    s === "cancelled" ? "#ffecec" :
    s === "completed" ? "#f3f3f3" :
    "#f3f3f3";

  const fg =
    s === "confirmed" ? "#0a7a2f" :
    s === "cancelled" ? "#a10000" :
    s === "completed" ? "#333" :
    "#333";

  return (
    <span style={{ padding: "2px 8px", borderRadius: 999, background: bg, color: fg, fontSize: 13 }}>
      {status}
    </span>
  );
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
  // Normalize casing if backend is lowercase
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

const th = {
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: "1px solid #eee",
  fontSize: 13,
};

const td = {
  padding: "8px 6px",
  borderBottom: "1px solid #f3f3f3",
  fontSize: 14,
};

const btnLink = {
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#0b5fff",
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: 14,
};