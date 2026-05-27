import Link from "next/link";
import { Users, Mail, Phone, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleToggle } from "@/app/admin/usuarios/_components/role-toggle";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ role?: string }>;

const ROLE_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Admins" },
  { value: "customer", label: "Clientes" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { role } = await searchParams;
  const activeFilter = role && role !== "all" ? role : null;

  const { user: currentUser } = await requireAdmin();
  const admin = createAdminClient();

  // listUsers paginates — for an MVP one page of 200 is fine. Add real
  // pagination when the user base grows.
  const { data: usersData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const authUsers = usersData?.users ?? [];

  const userIds = authUsers.map((u) => u.id);

  // Fetch profile rows (role, full_name, phone) in a single batch.
  type ProfileRow = {
    id: string;
    full_name: string | null;
    phone: string | null;
    role: "customer" | "admin";
  };
  let profilesById = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, phone, role")
      .in("id", userIds);
    profilesById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
    );
  }

  // Order counts grouped by user_id. We fetch all order rows just to count —
  // not ideal at scale, but for an MVP with hundreds of orders it's fine.
  const orderCounts = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: orders } = await admin
      .from("orders")
      .select("user_id")
      .in("user_id", userIds);
    for (const o of orders ?? []) {
      orderCounts.set(o.user_id, (orderCounts.get(o.user_id) ?? 0) + 1);
    }
  }

  // Merge auth user + profile + order count, filter by role.
  const rows = authUsers
    .map((u) => {
      const p = profilesById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        role: p?.role ?? ("customer" as const),
        created_at: u.created_at ?? "",
        order_count: orderCounts.get(u.id) ?? 0,
      };
    })
    .filter((r) => !activeFilter || r.role === activeFilter)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const adminCount = Array.from(profilesById.values()).filter(
    (p) => p.role === "admin",
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Usuarios"
        description={`${authUsers.length} cuenta${authUsers.length === 1 ? "" : "s"} registrada${authUsers.length === 1 ? "" : "s"}. ${adminCount} admin${adminCount === 1 ? "" : "s"}.`}
      />

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {ROLE_TABS.map((tab) => {
          const isActive =
            (tab.value === "all" && !activeFilter) ||
            tab.value === activeFilter;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/usuarios"
                  : `/admin/usuarios?role=${tab.value}`
              }
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin usuarios"
          description="Cambia de filtro o espera a que alguien se registre."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name ?? (
                      <span className="italic text-muted-foreground">
                        (sin nombre)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${u.email}`}
                      className="inline-flex items-center gap-1 text-sm hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {u.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.phone ? (
                      <a
                        href={`tel:${u.phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {u.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.order_count > 0 ? (
                      <Link
                        href={`/admin/pedidos?user=${u.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {u.order_count}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge variant="default">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="muted">Cliente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleToggle
                      userId={u.id}
                      currentRole={u.role}
                      isSelf={u.id === currentUser.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
