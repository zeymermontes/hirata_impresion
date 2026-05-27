"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Truck } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateOrderStatusAction,
  type OrderActionState,
} from "@/app/admin/pedidos/actions";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { COMMON_CARRIERS } from "@/lib/shipping-carriers";

const ORDER_STATUSES = [
  "pending",
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type Props = {
  orderId: string;
  currentStatus: string;
  currentTrackingNumber: string | null;
  currentCarrier: string | null;
};

export function StatusChanger({
  orderId,
  currentStatus,
  currentTrackingNumber,
  currentCarrier,
}: Props) {
  const action = updateOrderStatusAction.bind(null, orderId);
  const [state, formAction] = useActionState<
    OrderActionState | undefined,
    FormData
  >(action, undefined);

  const [status, setStatus] = useState<string>(currentStatus);
  const needsTracking = status === "shipped" || status === "delivered";

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-1.5">
        <Label htmlFor="status">Cambiar estado</Label>
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </Select>
      </div>

      {needsTracking ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
            <Truck className="h-3.5 w-3.5" />
            Datos de envío
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="carrier">Paquetería</Label>
            <Input
              id="carrier"
              name="carrier"
              defaultValue={currentCarrier ?? ""}
              required={status === "shipped"}
              placeholder="Ej. DHL, FedEx, Estafeta..."
              list="carrier-options"
            />
            <datalist id="carrier-options">
              {COMMON_CARRIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {state?.errors?.carrier?.[0] ? (
              <p className="text-xs text-destructive">
                {state.errors.carrier[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tracking_number">Número de guía</Label>
            <Input
              id="tracking_number"
              name="tracking_number"
              defaultValue={currentTrackingNumber ?? ""}
              required={status === "shipped"}
              placeholder="1234567890"
            />
            {state?.errors?.tracking_number?.[0] ? (
              <p className="text-xs text-destructive">
                {state.errors.tracking_number[0]}
              </p>
            ) : null}
          </div>

          <p className="text-xs text-amber-900">
            El cliente verá esta información en su pedido. Si reconocemos la
            paquetería, también le mostramos un link directo para rastrear.
          </p>
        </div>
      ) : null}

      {state?.message ? (
        <p
          className={
            state.ok
              ? "rounded-md bg-emerald-100 p-2 text-xs text-emerald-900"
              : "rounded-md bg-destructive/10 p-2 text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <SaveButton />
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
      <Check className="h-3.5 w-3.5" />
      {pending ? "Guardando..." : "Actualizar"}
    </Button>
  );
}
