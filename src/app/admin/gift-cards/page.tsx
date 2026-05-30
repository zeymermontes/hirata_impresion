import Link from "next/link";
import { Gift } from "lucide-react";
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
import { requireAdmin } from "@/lib/auth";
import { formatMXN } from "@/lib/utils";

export const metadata = { title: "Gift cards" };
export const dynamic = "force-dynamic";

type CardRow = {
  id: string;
  code: string;
  initial_amount: number;
  balance: number;
  recipient_email: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  expires_at: string | null;
  delivered_at: string | null;
  active: boolean;
  created_at: string;
  order_id: string | null;
};

export default async function GiftCardsAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: cards } = await supabase
    .from("gift_cards")
    .select(
      "id, code, initial_amount, balance, recipient_email, recipient_name, sender_name, expires_at, delivered_at, active, created_at, order_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (cards ?? []) as CardRow[];

  // Count redemptions per card so the admin can see usage at a glance.
  const redemptionCounts = new Map<string, number>();
  if (rows.length > 0) {
    const { data: red } = await supabase
      .from("gift_card_redemptions")
      .select("gift_card_id")
      .in(
        "gift_card_id",
        rows.map((r) => r.id),
      );
    for (const r of red ?? []) {
      redemptionCounts.set(
        r.gift_card_id,
        (redemptionCounts.get(r.gift_card_id) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gift cards"
        description="Tarjetas emitidas desde productos tipo gift card. Cada compra confirmada genera un código y envía email al destinatario."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Aún no se ha emitido ninguna gift card"
          description="Marca un producto como gift card en /admin/productos y haz una compra de prueba. Aparecerá aquí cuando el pago se confirme."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Inicial</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold">{c.code}</p>
                    {c.order_id ? (
                      <Link
                        href={`/admin/pedidos/${c.order_id}`}
                        className="text-[10px] text-muted-foreground hover:underline"
                      >
                        Pedido #{c.order_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Emitida manualmente
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{c.recipient_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.recipient_email ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMXN(Number(c.initial_amount))}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatMXN(Number(c.balance))}
                  </TableCell>
                  <TableCell className="text-xs">
                    {redemptionCounts.get(c.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    {!c.active ? (
                      <Badge variant="muted">Agotada</Badge>
                    ) : c.delivered_at ? (
                      <Badge variant="success">Entregada</Badge>
                    ) : (
                      <Badge variant="warning">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.expires_at
                      ? new Date(c.expires_at).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
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
