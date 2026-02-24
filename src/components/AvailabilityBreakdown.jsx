// src/components/AvailabilityBreakdown.jsx
export default function AvailabilityBreakdown({ result }) {
  if (!result) return null;

  const available = !!result.available;
  const availability = Array.isArray(result.availability) ? result.availability : [];
  const shortages = Array.isArray(result.shortages) ? result.shortages : [];

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <strong>Availability:</strong>{" "}
        <span style={{ fontWeight: 700 }}>
          {available ? "✅ Available" : "❌ Not available"}
        </span>
      </div>

      {availability.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Required</th>
                <th style={th}>Available</th>
                <th style={th}>Shortage</th>
              </tr>
            </thead>
            <tbody>
              {availability.map((it, idx) => (
                <tr key={it.inventory_item_id ?? idx}>
                  <td style={td}>
                    {it.name ? (
                      <>
                        {it.name} <small>#{it.inventory_item_id}</small>
                      </>
                    ) : (
                      <>Item #{it.inventory_item_id ?? "—"}</>
                    )}
                  </td>
                  <td style={td}>{it.required_quantity ?? it.required ?? "—"}</td>
                  <td style={td}>{it.available_quantity ?? it.available ?? "—"}</td>
                  <td style={td}>{it.shortage ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ color: "#666" }}>
          No breakdown returned (this usually means no requirements were sent).
        </div>
      )}

      {shortages.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong>Shortages:</strong>
          <ul style={{ marginTop: 6 }}>
            {shortages.map((s, idx) => (
              <li key={s.inventory_item_id ?? idx}>
                Item #{s.inventory_item_id}: shortage {s.shortage ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #eee", fontSize: 13 };
const td = { padding: "8px 6px", borderBottom: "1px solid #f3f3f3", fontSize: 14 };