import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function isAdminLike(role) {
  return role === "owner" || role === "admin";
}

export default function Dashboard() {
  const { user, role, currentOrganisation, refreshMe } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  const joinCode = useMemo(() => {
    const raw = currentOrganisation?.join_code;
    if (!raw) return null;
    return String(raw).trim().toUpperCase();
  }, [currentOrganisation?.join_code]);

  async function copyJoinCode() {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      // Keep it simple for now. Later we can replace with a toast.
      alert("Join code copied.");
    } catch {
      window.prompt("Copy join code:", joinCode);
    }
  }

  async function fetchMembers() {
    setMembersErr("");
    setLoadingMembers(true);

    try {
      const res = await api.get("/organisations/members");
      const payload = res?.data?.data ?? [];
      setMembers(Array.isArray(payload) ? payload : []);
    } catch (e) {
      const status = e?.response?.status;

      if (status === 401) setMembersErr("Unauthenticated. Please log out and log in again.");
      else if (status === 403) setMembersErr("Members list is only available to admins/owners.");
      else if (status === 409) setMembersErr("No active organisation selected.");
      else setMembersErr(e?.response?.data?.message || "Failed to load members.");

      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  // Ensure dashboard is hydrated (pull /me again on mount if needed)
  useEffect(() => {
    if (user && !currentOrganisation) {
      refreshMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load members when admin-like + org exists
  useEffect(() => {
    if (isAdminLike(role) && currentOrganisation?.id) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, currentOrganisation?.id]);

  const roleLabel = role || "unknown";
  const orgLabel = currentOrganisation?.name
    ? `${currentOrganisation.name} (ID ${currentOrganisation.id})`
    : "Not available";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Organisation overview and member access."
        right={
          isAdminLike(role) ? (
            <Button variant="outline" onClick={fetchMembers} disabled={loadingMembers}>
              Refresh members
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <div className="text-muted-foreground">Signed in as:</div>
              <div className="font-medium">{user?.email || "—"}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground">Role:</div>
              <Badge variant={isAdminLike(role) ? "default" : "secondary"}>{roleLabel}</Badge>
            </div>

            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <div className="text-muted-foreground">Current organisation:</div>
              <div className="font-medium">{orgLabel}</div>
            </div>

            {isAdminLike(role) ? (
              <div className="pt-2">
                <div className="text-muted-foreground mb-2">Join code</div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                    {joinCode || "Not available"}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyJoinCode}
                    disabled={!joinCode}
                  >
                    Copy
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  Share this code to let staff join your organisation.
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <a href="/bookings/new">New booking</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/inventory">Manage inventory</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/packages">Build packages</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/addons">Manage addons</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {isAdminLike(role) ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchMembers} disabled={loadingMembers}>
              Refresh
            </Button>
          </CardHeader>

          <CardContent>
            {membersErr ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {membersErr}
              </div>
            ) : null}

            {loadingMembers ? (
              <div className="text-sm text-muted-foreground mt-3">Loading…</div>
            ) : members.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-3">No members found.</div>
            ) : (
              <div className="mt-3 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[140px]">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-muted-foreground">{m.email}</TableCell>
                        <TableCell>
                          <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}