export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  in_production: "En producción",
  ready: "Listo para recoger",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "muted"
> = {
  pending: "warning",
  paid: "secondary",
  in_production: "default",
  ready: "default",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
};

export function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
