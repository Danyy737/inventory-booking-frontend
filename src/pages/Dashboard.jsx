import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { toast } from "sonner";

import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Calendar,
  Boxes,
  Package as PackageIcon,
  PlusCircle,
  Users,
  Copy,
  RefreshCw,
} from "lucide-react";

function isAdminLike(role) {
  return role === "owner" || role === "admin";
}

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const { user, role, currentOrganisation, refreshMe } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  // Stats + recent
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState("");
  const [stats, setStats] = useState({
    bookings: 0,
    inventoryItems: 0,
    packages: 0,
    addons: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);

  const joinCode = useMemo(() => {
    const raw = currentOrganisation?.join_code;
    if (!raw) return null;
    return String(raw).trim().toUpperCase();
  }, [currentOrganisation?.join_code]);

  async function copyJoinCode() {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Join code copied");
    } catch {
      toast.error("Failed to copy join code");
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

  async function fetchStatsAndRecent() {
    setStatsErr("");
    setStatsLoading(true);

    try {
      const [bookingsRes, invRes, pkgRes, addonsRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/inventory/items"),
        api.get("/packages"),
        api.get("/addons"),
      ]);

      const bookings = bookingsRes?.data?.data ?? bookingsRes?.data ?? [];
      const inv = invRes?.data?.data ?? invRes?.data ?? [];
      const pkgs = pkgRes?.data?.data ?? pkgRes?.data ?? [];
      const addons = addonsRes?.data?.data ?? addonsRes?.data ?? [];

      const bookingsArr = Array.isArray(bookings) ? bookings : [];
      const invArr = Array.isArray(inv) ? inv : [];
      const pkgsArr = Array.isArray(pkgs) ? pkgs : [];
      const addonsArr = Array.isArray(addons) ? addons : [];

      setStats({
        bookings: bookingsArr.length,
        inventoryItems: invArr.length,
        packages: pkgsArr.length,
        addons: addonsArr.length,
      });

      const recent = [...bookingsArr]
        .sort((a, b) => {
          const aT = new Date(a?.start_at ?? 0).getTime() || 0;
          const bT = new Date(b?.start_at ?? 0).getTime() || 0;
          return bT - aT;
        })
        .slice(0, 5);

      setRecentBookings(recent);
    } catch (e) {
      setStatsErr(e?.response?.data?.message ?? e?.message ?? "Failed to load dashboard stats.");
      setStats({
        bookings: 0,
        inventoryItems: 0,
        packages: 0,
        addons: 0,
      });
      setRecentBookings([]);
    } finally {
      setStatsLoading(false);
    }
  }

  // Ensure dashboard is hydrated
  useEffect(() => {
    if (user && !currentOrganisation) refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load members when admin-like + org exists
  useEffect(() => {
    if (isAdminLike(role) && currentOrganisation?.id) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, currentOrganisation?.id]);

  // Load stats/recent when org exists
  useEffect(() => {
    if (currentOrganisation?.id) {
      fetchStatsAndRecent();
    } else {
      setStatsLoading(false);
      setRecentBookings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganisation?.id]);

  const roleLabel = role || "unknown";
  const orgLabel = currentOrganisation?.name
    ? `${currentOrganisation.name} (ID ${currentOrganisation.id})`
    : "No organisation selected";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your organisation and quick actions."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchStatsAndRecent}
              disabled={statsLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {isAdminLike(role) ? (
              <Button
                variant="outline"
                onClick={fetchMembers}
                disabled={loadingMembers}
              >
                <Users className="h-4 w-4 mr-2" />
                Refresh members
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Hero row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Welcome back</div>
          <div className="text-2xl font-semibold leading-tight">
            {user?.name ?? user?.email ?? "User"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={isAdminLike(role) ? "default" : "secondary"}>
              {roleLabel}
            </Badge>
            <Badge variant="secondary">{orgLabel}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/bookings/new">New booking</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inventory">Inventory</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/packages">Packages</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/addons">Addons</Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Bookings"
          value={statsLoading ? "—" : stats.bookings}
          subtitle="Total bookings"
          Icon={Calendar}
          to="/bookings"
        />
        <StatCard
          title="Inventory items"
          value={statsLoading ? "—" : stats.inventoryItems}
          subtitle="Tracked items"
          Icon={Boxes}
          to="/inventory"
        />
        <StatCard
          title="Packages"
          value={statsLoading ? "—" : stats.packages}
          subtitle="Reusable bundles"
          Icon={PackageIcon}
          to="/packages"
        />
        <StatCard
          title="Addons"
          value={statsLoading ? "—" : stats.addons}
          subtitle="Optional extras"
          Icon={PlusCircle}
          to="/addons"
        />
      </div>

      {statsErr ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {statsErr}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Organisation card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Signed in as</div>
                <div className="font-medium">{user?.email || "—"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Current organisation</div>
                <div className="font-medium">{orgLabel}</div>
              </div>
            </div>

            {isAdminLike(role) ? (
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Join code</div>
                    <div className="mt-1 font-mono text-lg tracking-wider">
                      {joinCode || "Not available"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Share this code so staff can join your organisation.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyJoinCode}
                    disabled={!joinCode}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Recent bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent bookings</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : recentBookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No bookings yet. Create your first booking.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">ID</TableHead>
                      <TableHead>Start</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((b) => (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <Link
                            className="underline-offset-4 hover:underline"
                            to={`/bookings/${b.id}`}
                          >
                            #{b.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmt(b.start_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      {isAdminLike(role) ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMembers}
              disabled={loadingMembers}
            >
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
              <div className="text-sm text-muted-foreground mt-3">
                No members found.
              </div>
            ) : (
              <div className="mt-3 rounded-md border overflow-x-auto">
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
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.role === "owner" ? "default" : "secondary"}
                          >
                            {m.role}
                          </Badge>
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

function StatCard({ title, value, subtitle, Icon, to }) {
  return (
    <Card className="hover:shadow-sm transition">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          </div>

          <div className="h-9 w-9 rounded-xl border bg-muted/40 flex items-center justify-center">
            <Icon className="h-4 w-4 opacity-80" />
          </div>
        </div>

        <div className="mt-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={to}>Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}