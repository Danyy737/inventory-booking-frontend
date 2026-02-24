// src/pages/BookingNew.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { createBooking, previewBookingAvailability } from "../api/bookings";
import AvailabilityBreakdown from "../components/AvailabilityBreakdown";

export default function BookingNew() {
  const nav = useNavigate();

  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [packageId, setPackageId] = useState("");

  const [packages, setPackages] = useState([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

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
      } finally {
        setLoadingPkgs(false);
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

        // Try common shapes
        const rawItems =
          pkg?.items ??
          pkg?.package_items ??
          pkg?.packageItems ??
          pkg?.data?.items ??
          [];

        const mapped = (Array.isArray(rawItems) ? rawItems : [])
          .map((pi) => ({
            inventory_item_id: pi.inventory_item_id ?? pi.inventoryItemId ?? pi.item_id ?? pi.inventory_item?.id,
            quantity: Number(pi.quantity ?? pi.qty ?? pi.required_quantity ?? 0),
          }))
          .filter((x) => Number.isFinite(x.inventory_item_id) && x.quantity > 0);

        setItems(mapped);
      } catch (e) {
        setErr(e?.response?.data?.message ?? e?.message ?? "Failed to load package items");
      }
    })();
  }, [packageId]);

  const canCheck = useMemo(() => {
    return Boolean(startLocal && endLocal && packageId && items.length > 0);
  }, [startLocal, endLocal, packageId, items.length]);

  function toISO(local) {
    // datetime-local interpreted in local timezone → convert to UTC ISO
    const d = new Date(local);
    return d.toISOString();
  }

  async function onCheck() {
    setErr("");
    setPreview(null);

    if (!startLocal || !endLocal || !packageId) {
      setErr("Please choose start time, end time, and a package.");
      return;
    }

    if (items.length === 0) {
      setErr("This package has no items (or they failed to load). Add items to the package first.");
      return;
    }

    setChecking(true);
    try {
      const payload = {
        start_at: toISO(startLocal),
        end_at: toISO(endLocal),

        // Backend appears to care about requirements/items, not package_id.
        // We can still include package_id for bookkeeping if your backend ignores it.
        package_id: Number(packageId),

        // ✅ This is what your backend needs
        items,
      };

      const res = await previewBookingAvailability(payload);
      setPreview(res);
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Availability check failed");
    } finally {
      setChecking(false);
    }
  }

  async function onCreate() {
    setErr("");

    if (!preview?.available) {
      setErr("Booking is not available. Fix shortages or change dates.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        start_at: toISO(startLocal),
        end_at: toISO(endLocal),
        package_id: Number(packageId),
        items,
      };

      const created = await createBooking(payload);
      const newId =
        created?.id ??
        created?.data?.id ??
        created?.booking?.id ??
        created?.data?.booking?.id;

      nav(newId ? `/bookings/${newId}` : "/bookings");
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Create booking failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>New Booking</h2>
        <Link to="/bookings">Back</Link>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label>Start</label>
          <input
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            style={input}
          />
        </div>
        <div>
          <label>End</label>
          <input
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            style={input}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label>Package</label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            style={input}
            disabled={loadingPkgs}
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
        </div>
      </div>

      <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
        Loaded package requirements: <strong>{items.length}</strong> item(s)
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button onClick={onCheck} disabled={!canCheck || checking}>
          {checking ? "Checking…" : "Check availability"}
        </button>

        <button onClick={onCreate} disabled={!preview?.available || creating} title={!preview ? "Run check first" : ""}>
          {creating ? "Creating…" : "Confirm booking"}
        </button>
      </div>

      {err && <div style={{ marginTop: 10, color: "crimson" }}>{err}</div>}

      {preview && (
        <div style={{ marginTop: 14 }}>
          <AvailabilityBreakdown result={preview} />
        </div>
      )}
    </div>
  );
}

const input = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", marginTop: 6 };