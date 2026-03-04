// src/pages/Onboarding.jsx
import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Onboarding() {
  const { refreshMe, logout } = useAuth();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [err, setErr] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function createOrg(e) {
    e.preventDefault();
    if (loadingCreate || loadingJoin) return;

    setErr("");
    const name = orgName.trim();
    if (!name) {
      setErr("Organisation name is required.");
      toast.error("Organisation name is required");
      return;
    }

    setLoadingCreate(true);
    try {
      await api.post("/organisations", { name });
      await refreshMe();
      toast.success("Organisation created");
      navigate("/", { replace: true }); // ✅ dashboard route in your app
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to create organisation.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoadingCreate(false);
    }
  }

  async function joinOrg(e) {
    e.preventDefault();
    if (loadingCreate || loadingJoin) return;

    setErr("");
    const code = joinCode.trim();
    if (!code) {
      setErr("Join code is required.");
      toast.error("Join code is required");
      return;
    }

    setLoadingJoin(true);
    try {
      await api.post("/organisations/join", { join_code: code });
      await refreshMe();
      toast.success("Joined organisation");
      navigate("/", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to join organisation.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoadingJoin(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border bg-muted flex items-center justify-center font-semibold">
              IB
            </div>
            <div className="leading-tight">
              <div className="font-semibold">Get started</div>
              <div className="text-xs text-muted-foreground">
                Create an organisation or join one with a code.
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {err ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Create org */}
          <Card>
            <CardHeader>
              <CardTitle>Create organisation</CardTitle>
              <CardDescription>Start fresh and invite your team with a join code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organisation name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g. Party Hire Co"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={loadingCreate || loadingJoin}
                    required
                  />
                </div>

                <Button className="w-full" type="submit" disabled={loadingCreate || loadingJoin}>
                  {loadingCreate ? "Creating…" : "Create organisation"}
                </Button>
              </form>

              <Separator />

              <div className="text-xs text-muted-foreground">
                Tip: keep it simple — you can rename it later.
              </div>
            </CardContent>
          </Card>

          {/* Join org */}
          <Card>
            <CardHeader>
              <CardTitle>Join with code</CardTitle>
              <CardDescription>Enter a join code shared by your admin/owner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={joinOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">Join code</Label>
                  <Input
                    id="joinCode"
                    placeholder="e.g. A1B2C3"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    disabled={loadingCreate || loadingJoin}
                    required
                  />
                </div>

                <Button className="w-full" type="submit" disabled={loadingCreate || loadingJoin}>
                  {loadingJoin ? "Joining…" : "Join organisation"}
                </Button>
              </form>

              <Separator />

              <div className="text-xs text-muted-foreground">
                Join codes are case-insensitive — paste works too.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}