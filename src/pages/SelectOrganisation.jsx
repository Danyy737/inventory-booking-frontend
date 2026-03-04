// src/pages/SelectOrganisation.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function roleVariant(role) {
  const r = String(role || "").toLowerCase();
  if (r === "owner" || r === "admin") return "default";
  return "secondary";
}

export default function SelectOrganisation() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectingId, setSelectingId] = useState(null);

  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  async function load({ silent = false } = {}) {
    if (!silent) setError("");
    setLoading(true);
    try {
      const res = await api.get("/my/organisations");
      setOrgs(res.data?.data ?? []);
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to load organisations.";
      setError(msg);
      toast.error(msg);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await load();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelect(orgId) {
    if (selectingId) return;

    setSelectingId(orgId);
    setError("");

    try {
      await api.post("/me/select-organisation", { organisation_id: orgId });
      await refreshMe();

      toast.success("Organisation selected");
      navigate("/", { replace: true }); // ✅ dashboard route in your app
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to select organisation.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSelectingId(null);
    }
  }

  const count = useMemo(() => orgs.length, [orgs.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Select organisation"
        description="Choose which organisation you want to manage right now."
        right={
          <Button variant="outline" onClick={() => load()} disabled={loading || !!selectingId}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your organisations</CardTitle>
          <Badge variant="secondary">{count}</Badge>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading organisations…</div>
          ) : orgs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              You don’t belong to any organisations yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {orgs.map((org) => {
                const isSelecting = selectingId === org.id;

                return (
                  <div
                    key={org.id}
                    className="rounded-xl border bg-card p-4 transition hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{org.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant={roleVariant(org.role)} className="capitalize">
                            {org.role ?? "unknown"}
                          </Badge>
                          <span>•</span>
                          <span className="truncate">slug: {org.slug ?? "-"}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">#{org.id}</div>
                    </div>

                    <div className="mt-4">
                      <Button
                        className="w-full"
                        onClick={() => handleSelect(org.id)}
                        disabled={!!selectingId}
                      >
                        {isSelecting ? "Selecting…" : "Select"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}