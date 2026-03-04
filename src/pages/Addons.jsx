// src/pages/Addons.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatCents(cents) {
  const dollars = (Number(cents || 0) / 100).toFixed(2);
  return `$${dollars}`;
}

export default function Addons() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function fetchAddons() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/addons");
      setAddons(res.data?.data ?? []);
    } catch (e) {
      setErr(e?.response?.data?.message ?? "Failed to load addons.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAddon(id) {
    const ok = window.confirm("Delete this addon? This cannot be undone.");
    if (!ok) return;

    try {
      await api.delete(`/addons/${id}`);
      setAddons((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e?.response?.data?.message ?? "Failed to delete addon.");
    }
  }

  useEffect(() => {
    fetchAddons();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return addons;
    return addons.filter((a) => {
      const name = String(a.name || "").toLowerCase();
      const desc = String(a.description || "").toLowerCase();
      const id = String(a.id || "");
      return name.includes(query) || desc.includes(query) || id.includes(query);
    });
  }, [addons, q]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Addons"
        description="Create optional add-ons that reserve inventory and add extra pricing to bookings."
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchAddons}>
              Refresh
            </Button>
            <Button asChild>
              <Link to="/addons/new">+ Create addon</Link>
            </Button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All addons</CardTitle>
          <div className="w-full max-w-xs">
            <Input placeholder="Search addons…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {addons.length === 0 ? "No addons yet." : "No results for your search."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead className="text-right w-[110px]">Items</TableHead>
                    <TableHead className="text-right w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {a.description || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">#{a.id}</div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={a.is_active ? "default" : "secondary"}>
                          {a.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{a.pricing_type}</span>{" "}
                          <span className="text-muted-foreground">• {formatCents(a.price_cents)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {(a.items ?? []).length}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/addons/${a.id}/edit`}>Edit</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteAddon(a.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional: quick expandable detail blocks (keep it simple, table is enough) */}
    </div>
  );
}