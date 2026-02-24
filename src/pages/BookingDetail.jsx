// src/pages/BookingDetail.jsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelBooking, getBooking, getPackingList } from "../api/bookings";

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

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson" }}>{err}</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/bookings">Back</Link>
        </div>
      </div>
    );
  }

  const rawStatus = String(booking?.status || "").toLowerCase();
  const displayStatus = getDisplayStatus(booking);
  const cancellable = isCancellable(booking);

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Booking #{booking?.id}</h2>
        <Link to="/bookings">Back</Link>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div>
          <strong>Start (local):</strong> {fmt(booking?.start_at)}
        </div>
        <div>
          <strong>End (local):</strong> {fmt(booking?.end_at)}
        </div>

        <div style={{ marginTop: 8 }}>
          <strong>Status:</strong> {displayStatus}

          {cancellable ? (
            <>
              {" "}
              ·{" "}
              <button onClick={onCancel} style={btnDanger}>
                Cancel booking
              </button>
            </>
          ) : (
            <div style={{ marginTop: 8, color: "#777" }}>
              {rawStatus === "cancelled"
                ? "This booking is cancelled."
                : isCompleted(booking)
                  ? "This booking has ended and is marked as completed."
                  : "This booking has already started, so it can’t be cancelled."}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 8 }}>Reserved items</h3>
        <ReservedItems booking={booking} />
      </div>

      <div style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 8 }}>Packing list</h3>
        <button onClick={onLoadPacking} disabled={packingLoading}>
          {packingLoading ? "Loading…" : "Load packing list"}
        </button>

        {packing && (
          <div style={{ marginTop: 10 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
              <h4 style={{ marginTop: 0 }}>Packing checklist</h4>

              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(packing.packing_list || []).map((it) => (
                  <li key={it.inventory_item_id}>
                    <strong>{it.required_quantity}×</strong> {it.name}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 12, color: "#333" }}>
                <strong>Summary:</strong>{" "}
                {packing.summary?.unique_items ?? (packing.packing_list || []).length} unique items ·{" "}
                {packing.summary?.total_units ?? "—"} total units
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReservedItems({ booking }) {
  const reservations =
    booking?.reservations ??
    booking?.inventory_reservations ??
    booking?.items ??
    [];

  if (!Array.isArray(reservations) || reservations.length === 0) {
    return <div style={{ color: "#666" }}>No reservation breakdown returned.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Item</th>
            <th style={th}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r, idx) => {
            const itemId = r.inventory_item_id ?? r.item_id ?? r.inventoryItemId;
            const qty = r.reserved_quantity ?? r.quantity ?? r.qty;
            const name = r.inventory_item?.name ?? r.item?.name ?? r.name;
            return (
              <tr key={r.id ?? `${itemId}-${idx}`}>
                <td style={td}>{name ? `${name} (#${itemId})` : `Item #${itemId}`}</td>
                <td style={td}>{qty}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
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

const th = { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #eee", fontSize: 13 };
const td = { padding: "8px 6px", borderBottom: "1px solid #f3f3f3", fontSize: 14 };

const btnDanger = {
  marginLeft: 8,
  background: "#ffecec",
  border: "1px solid #f3b5b5",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
};