import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

/**
 * Availability Page (MVP)
 * Uses your real backend routes:
 * - GET  /inventory/items
 * - GET  /packages
 * - POST /bookings/preview-availability
 *
 * Notes:
 * - This page is just a checker. It does NOT create a booking.
 * - Optional "Create booking" button navigates to /bookings/new with prefilled state.
 */

function toLocalInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toISOFromLocalInput(localValue) {
  if (!localValue) return null;
  const d = new Date(localValue);
  return d.toISOString();
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export default function Availability() {
  const navigate = useNavigate();

  // Defaults: now -> +2 hours
  const [startAtLocal, setStartAtLocal] = useState(() => toLocalInputValue(new Date()));
  const [endAtLocal, setEndAtLocal] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return toLocalInputValue(d);
  });

  const [inventoryOptions, setInventoryOptions] = useState([]);
  const [packageOptions, setPackageOptions] = useState([]);

  // each line: { type: "item"|"package", id: "", quantity: 1 }
  const [lines, setLines] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null); // normalized

  const startISO = useMemo(() => toISOFromLocalInput(startAtLocal), [startAtLocal]);
  const endISO = useMemo(() => toISOFromLocalInput(endAtLocal), [endAtLocal]);

  // Load dropdown options
  useEffect(() => {
    let mounted = true;

    async function load() {
      setErr("");
      setLoadingOptions(true);
      try {
        // These match your backend routes exactly (no /api prefix here)
        const [invRes, pkgRes] = await Promise.all([
          api.get("/inventory/items"),
          api.get("/packages"),
        ]);

        // Laravel often returns { data: [...] }
        const inv = invRes?.data?.data ?? invRes?.data ?? [];
        const pkgs = pkgRes?.data?.data ?? pkgRes?.data ?? [];

        if (!mounted) return;
        setInventoryOptions(Array.isArray(inv) ? inv : []);
        setPackageOptions(Array.isArray(pkgs) ? pkgs : []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load inventory/packages.");
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function addLine(type) {
    setResult(null);
    setLines((prev) => [...prev, { type, id: "", quantity: 1 }]);
  }

  function updateLine(idx, patch) {
    setResult(null);
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx) {
    setResult(null);
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const payload = useMemo(() => {
    const items = lines
      .filter((l) => l.type === "item" && l.id)
      .map((l) => ({
        inventory_item_id: safeNum(l.id),
        quantity: safeNum(l.quantity),
      }))
      .filter((x) => x.inventory_item_id > 0 && x.quantity > 0);

    const packages = lines
      .filter((l) => l.type === "package" && l.id)
      .map((l) => ({
        package_id: safeNum(l.id),
        quantity: safeNum(l.quantity),
      }))
      .filter((x) => x.package_id > 0 && x.quantity > 0);

    return {
      start_at: startISO,
      end_at: endISO,
      items,
      packages,
    };
  }, [lines, startISO, endISO]);

  const canCheck = useMemo(() => {
    if (!payload.start_at || !payload.end_at) return false;
    const s = new Date(payload.start_at).getTime();
    const e = new Date(payload.end_at).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return false;
    if (payload.items.length === 0 && payload.packages.length === 0) return false;
    return true;
  }, [payload]);

  function normalizePreviewResponse(raw) {
    // Your BookingController@previewAvailability might return any structure.
    // We'll normalize defensively.

    // Common places:
    const data = raw?.data ?? raw;

    // boolean flags that might exist:
    const ok =
      Boolean(
        data?.ok ??
          data?.available ??
          data?.is_available ??
          data?.availability?.ok ??
          data?.availability?.available
      );

    // requirements/breakdown might live in different keys:
    const requirements =
      data?.requirements ??
      data?.items ??
      data?.availability?.requirements ??
      data?.availability?.items ??
      data?.breakdown ??
      data?.shortages ??
      [];

    // We want an array of rows with:
    // { inventory_item_id, name, required, available, shortage }
    // If your API already returns that, great. If not, this still displays something.
    const normalizedRows = Array.isArray(requirements)
      ? requirements.map((r) => ({
          inventory_item_id: r.inventory_item_id ?? r.id ?? null,
          name: r.name ?? r.inventory_item_name ?? r.item_name ?? null,
          required:
            r.required ??
            r.required_quantity ??
            r.qty_required ??
            r.requested ??
            r.quantity ??
            0,
          available:
            r.available ??
            r.available_quantity ??
            r.qty_available ??
            r.on_hand ??
            r.remaining ??
            0,
          shortage:
            r.shortage ??
            r.shortage_quantity ??
            r.qty_short ??
            r.missing ??
            0,
          _raw: r,
        }))
      : [];

    // If API doesn't provide ok but provides shortages, infer:
    const inferredOk =
      (data?.ok ?? data?.available ?? data?.is_available) != null
        ? ok
        : normalizedRows.every((r) => safeNum(r.shortage) <= 0);

    return {
      ok: inferredOk,
      requirements: normalizedRows,
      raw: data,
    };
  }

  async function checkAvailability() {
    setErr("");
    setChecking(true);
    setResult(null);

    try {
      // This matches your route list:
      // POST /bookings/preview-availability
      const res = await api.post("/bookings/preview-availability", payload);

      const normalized = normalizePreviewResponse(res?.data);
      setResult(normalized);
    } catch (e) {
      // If backend uses 409 for shortages, still show breakdown if it exists
      const status = e?.response?.status;
      const data = e?.response?.data;

      if ((status === 409 || status === 422) && data) {
        const normalized = normalizePreviewResponse(data);
        normalized.ok = false;
        setResult(normalized);
      } else {
        setErr(e?.response?.data?.message || e.message || "Availability check failed.");
      }
    } finally {
      setChecking(false);
    }
  }

  function goToCreateBooking() {
    // Adjust this route if your booking create page differs
    navigate("/bookings/new", {
      state: {
        start_at: payload.start_at,
        end_at: payload.end_at,
        items: payload.items,
        packages: payload.packages,
      },
    });
  }

  const statusText = useMemo(() => {
    if (!result) return "";
    return result.ok ? "✅ Available" : "❌ Not available (shortages found)";
  }, [result]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Availability</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Check if a set of items/packages can be booked for a time window — before creating a booking.
      </p>

      {err ? (
        <div style={{ padding: 12, border: "1px solid #f99", borderRadius: 8, marginBottom: 12 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {/* Date/time */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Start</span>
          <input
            type="datetime-local"
            value={startAtLocal}
            onChange={(e) => setStartAtLocal(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>End</span>
          <input
            type="datetime-local"
            value={endAtLocal}
            onChange={(e) => setEndAtLocal(e.target.value)}
          />
        </label>
      </div>

      {/* Add line buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => addLine("item")} disabled={loadingOptions}>
          + Add inventory item
        </button>
        <button type="button" onClick={() => addLine("package")} disabled={loadingOptions}>
          + Add package
        </button>
        {loadingOptions ? <span style={{ opacity: 0.7, alignSelf: "center" }}>Loading…</span> : null}
      </div>

      {/* Requested lines */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <b>Requested</b>
          <span style={{ opacity: 0.7 }}>{lines.length} line(s)</span>
        </div>

        {lines.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Add items or packages above.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {lines.map((l, idx) => {
              const isItem = l.type === "item";
              const options = isItem ? inventoryOptions : packageOptions;

              return (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 140px 90px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <span style={{ opacity: 0.85 }}>{isItem ? "Item" : "Package"}</span>

                  <select value={l.id} onChange={(e) => updateLine(idx, { id: e.target.value })}>
                    <option value="">Select {isItem ? "item" : "package"}…</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name ?? o.title ?? `#${o.id}`}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={l.quantity}
                    onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                    placeholder="Qty"
                  />

                  <button type="button" onClick={() => removeLine(idx)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Check button */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <button type="button" onClick={checkAvailability} disabled={!canCheck || checking}>
          {checking ? "Checking…" : "Check availability"}
        </button>
        {!canCheck ? (
          <span style={{ opacity: 0.7 }}>
            Add dates + at least one line (and ensure end &gt; start).
          </span>
        ) : null}
      </div>

      {/* Results */}
      {result ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div style={{ marginBottom: 12, fontSize: 18 }}>
            <b>{statusText}</b>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                    Inventory Item
                  </th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                    Required
                  </th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                    Available
                  </th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                    Shortage
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.requirements.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 8, opacity: 0.8 }}>
                      No breakdown returned by the API.
                      <br />
                      <span style={{ opacity: 0.7 }}>
                        If previewAvailability returns a different key than requirements/items/shortages,
                        paste its JSON response and I’ll map it exactly.
                      </span>
                    </td>
                  </tr>
                ) : (
                  result.requirements.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>
                        {r.name || (r.inventory_item_id ? `Item #${r.inventory_item_id}` : "Item")}
                      </td>
                      <td style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #f4f4f4" }}>
                        {safeNum(r.required)}
                      </td>
                      <td style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #f4f4f4" }}>
                        {safeNum(r.available)}
                      </td>
                      <td style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #f4f4f4" }}>
                        {safeNum(r.shortage)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" onClick={goToCreateBooking} disabled={!result.ok}>
              Create booking
            </button>
            {!result.ok ? (
              <span style={{ opacity: 0.7, alignSelf: "center" }}>
                Fix shortages or change dates to enable booking.
              </span>
            ) : (
              <span style={{ opacity: 0.7, alignSelf: "center" }}>
                Looks good — you can create the booking confidently.
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}