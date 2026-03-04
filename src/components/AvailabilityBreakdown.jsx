// src/components/AvailabilityBreakdown.jsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AvailabilityBreakdown({ result }) {
  if (!result) return null;

  const available = !!result.available;
  const availability = Array.isArray(result.availability) ? result.availability : [];
  const shortages = Array.isArray(result.shortages) ? result.shortages : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">Availability:</div>
        <Badge variant={available ? "default" : "destructive"}>
          {available ? "Available" : "Not available"}
        </Badge>
      </div>

      {availability.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-[140px]">Required</TableHead>
                <TableHead className="text-right w-[140px]">Available</TableHead>
                <TableHead className="text-right w-[140px]">Shortage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availability.map((it, idx) => (
                <TableRow key={it.inventory_item_id ?? idx}>
                  <TableCell className="font-medium">
                    {it.name ? (
                      <span>
                        {it.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          #{it.inventory_item_id ?? "—"}
                        </span>
                      </span>
                    ) : (
                      <span>Item #{it.inventory_item_id ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {it.required_quantity ?? it.required ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {it.available_quantity ?? it.available ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {it.shortage ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No breakdown returned (this usually means no requirements were sent).
        </div>
      )}

      {shortages.length > 0 ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium">Shortages</div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {shortages.map((s, idx) => (
                <li key={s.inventory_item_id ?? idx}>
                  Item #{s.inventory_item_id ?? "—"}: shortage {s.shortage ?? "—"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}