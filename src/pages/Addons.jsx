// src/pages/Addons.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatCents(cents) {
  const dollars = (Number(cents || 0) / 100).toFixed(2);
  return `$${dollars}`;
}

export default function Addons() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  async function fetchAddons({ silent = false } = {}) {
    if (!silent) setErr("");
    setLoading(true);
    try {
      const res = await api.get("/addons");
      setAddons(res.data?.data ?? []);
    } catch (e) {
      const msg = e?.response?.data?.message ?? "Failed to load addons.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAddon(id) {
    if (deletingId) return;

    setDeletingId(id);
    try {
      await api.delete(`/addons/${id}`);
      setAddons((prev) => prev.filter((a) => a.id !== id));
      toast.success("Addon deleted");
    } catch (e) {
      const msg = e?.response?.data?.message ?? "Failed to delete addon.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
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
            <Button variant="outline" onClick={() => fetchAddons()} disabled={!!deletingId}>
              Refresh
            </Button>
            <Button asChild>
              <Link to="/addons/new">+ Create addon</Link>
            </Button>
          </div>
        }
      />

      {/* Fallback inline error; toasts are primary */}
      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle>All addons</CardTitle>
            <Badge variant="secondary">{addons.length}</Badge>
          </div>

          <div className="w-full max-w-xs">
            <Input
              placeholder="Search addons…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
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
                    <TableHead className="text-right w-[240px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((a) => {
                    const isDeleting = deletingId === a.id;

                    return (
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
                            <span className="text-muted-foreground">
                              • {formatCents(a.price_cents)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">{(a.items ?? []).length}</TableCell>

                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Button asChild size="sm" variant="outline" disabled={!!deletingId}>
                              <Link to={`/addons/${a.id}/edit`}>Edit</Link>
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={!!deletingId}
                                >
                                  {isDeleting ? "Deleting…" : "Delete"}
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete “{a.name}”?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteAddon(a.id)}
                                    disabled={isDeleting}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {isDeleting ? "Deleting…" : "Confirm delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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