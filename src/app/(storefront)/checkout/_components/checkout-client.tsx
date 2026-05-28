"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Truck, Store, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PromotionsSummary } from "@/app/(storefront)/_components/promotions-summary";
import {
  PromoCodeInput,
  type AppliedCode,
} from "@/app/(storefront)/checkout/_components/promo-code-input";
import {
  createOrderAction,
  type CreateOrderState,
} from "@/app/(storefront)/checkout/actions";
import { evaluatePromotions, type PromotionRule } from "@/lib/promotions";
import { cn, formatMXN } from "@/lib/utils";

// Keep in sync with SHIPPING_FLAT_MXN in actions.ts — duplicated here so the
// client can show the breakdown in the live summary before the order is
// created server-side.
const SHIPPING_FLAT_MXN = 100;

type Address = {
  id: string;
  label: string;
  recipient: string;
  street: string;
  ext_number: string | null;
  city: string;
  state: string;
  zip: string;
  is_default: boolean;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string | null;
};

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  variant_name: string | null;
  image_url: string | null;
  category_id: string | null;
  additional_category_ids: string[];
};

type Props = {
  items: CartItem[];
  addresses: Address[];
  branches: Branch[];
  promotionRules: PromotionRule[];
};

export function CheckoutClient({
  items,
  addresses,
  branches,
  promotionRules,
}: Props) {
  const [state, formAction] = useActionState<
    CreateOrderState | undefined,
    FormData
  >(createOrderAction, undefined);

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [fulfillment, setFulfillment] = useState<"ship" | "pickup">(
    addresses.length > 0 ? "ship" : "pickup",
  );
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "");
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);

  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unit_price) * Number(i.quantity),
    0,
  );
  const rawShipping = fulfillment === "ship" ? SHIPPING_FLAT_MXN : 0;

  // Evaluate promotions against the current cart + fulfillment-selected
  // shipping cost. The same engine runs again on the server when the order is
  // created — we just preview here.
  const promos = evaluatePromotions(
    promotionRules,
    items.map((i) => ({
      product_id: i.product_id,
      category_id: i.category_id,
      additional_category_ids: i.additional_category_ids,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    rawShipping,
  );
  // Free shipping kicks in if EITHER an auto rule or the applied code grants
  // it. Discount totals stack — the code's contribution is added on top of
  // the rule total.
  const freeShipping = promos.free_shipping || (appliedCode?.free_shipping ?? false);
  const shipping = freeShipping ? 0 : rawShipping;
  const ruleSubtotalDiscount =
    promos.total_discount - (promos.free_shipping ? rawShipping : 0);
  const codeSubtotalDiscount = appliedCode
    ? appliedCode.discount_amount -
      (appliedCode.free_shipping ? rawShipping : 0)
    : 0;
  const subtotalDiscount = ruleSubtotalDiscount + codeSubtotalDiscount;
  const total = subtotal + shipping - subtotalDiscount;

  return (
    // Single <form> wrapping all three grid cells: shipping fields, summary,
    // and the continue button. On desktop, shipping + button stack in the
    // left column (rows 1 & 2) and the summary spans both rows in the right
    // column. On mobile, natural DOM order means shipping → summary →
    // button — the customer reviews the total before committing.
    <form
      action={formAction}
      className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8"
    >
      <input type="hidden" name="fulfillment" value={fulfillment} />
      {fulfillment === "ship" ? (
        <input type="hidden" name="address_id" value={addressId} />
      ) : (
        <input type="hidden" name="branch_id" value={branchId} />
      )}
      {appliedCode ? (
        <input
          type="hidden"
          name="promo_code"
          value={appliedCode.promo.code}
        />
      ) : null}

      <div className="space-y-6 lg:col-start-1 lg:row-start-1">
        <ShippingFields
          state={state}
          fulfillment={fulfillment}
          setFulfillment={setFulfillment}
          addressId={addressId}
          setAddressId={setAddressId}
          branchId={branchId}
          setBranchId={setBranchId}
          addresses={addresses}
          branches={branches}
        />
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <Summary
          items={items}
          subtotal={subtotal}
          rawShipping={rawShipping}
          shipping={shipping}
          subtotalDiscount={subtotalDiscount}
          total={total}
          fulfillment={fulfillment}
          promos={promos}
          appliedCode={appliedCode}
          onApplyCode={setAppliedCode}
          onRemoveCode={() => setAppliedCode(null)}
        />
      </div>

      <div className="lg:col-start-1 lg:row-start-2">
        <ContinueButton
          disabled={
            (fulfillment === "ship" && !addressId) ||
            (fulfillment === "pickup" && !branchId)
          }
        />
      </div>
    </form>
  );
}

function ShippingFields({
  state,
  fulfillment,
  setFulfillment,
  addressId,
  setAddressId,
  branchId,
  setBranchId,
  addresses,
  branches,
}: {
  state: CreateOrderState | undefined;
  fulfillment: "ship" | "pickup";
  setFulfillment: (v: "ship" | "pickup") => void;
  addressId: string;
  setAddressId: (v: string) => void;
  branchId: string;
  setBranchId: (v: string) => void;
  addresses: Address[];
  branches: Branch[];
}) {
  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">¿Cómo quieres recibirlo?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FulfillmentCard
            icon={Truck}
            title="Envío a domicilio"
            description={`Paquetería con guía rastreable. +${formatMXN(SHIPPING_FLAT_MXN)}.`}
            selected={fulfillment === "ship"}
            onClick={() => setFulfillment("ship")}
          />
          <FulfillmentCard
            icon={Store}
            title="Recoger en sucursal"
            description="Sin costo. Te avisamos cuando esté listo."
            selected={fulfillment === "pickup"}
            onClick={() => setFulfillment("pickup")}
            disabled={branches.length === 0}
          />
        </div>
      </section>

      {fulfillment === "ship" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dirección de envío</h2>
            <Link
              href="/mi-cuenta/direcciones"
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Administrar direcciones →
            </Link>
          </div>
          {addresses.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm">
              <p>Aún no tienes direcciones guardadas.</p>
              <Link
                href="/mi-cuenta/direcciones?next=/checkout"
                className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Agregar una dirección →
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="address-select">Elegir dirección</Label>
              <Select
                id="address-select"
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                required
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.street} {a.ext_number ?? ""}, {a.zip}{" "}
                    {a.city}
                  </option>
                ))}
              </Select>
              {addressId ? (
                <AddressPreview
                  address={addresses.find((a) => a.id === addressId)!}
                />
              ) : null}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sucursal para recoger</h2>
          {branches.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              No hay sucursales activas. Elige envío a domicilio.
            </p>
          ) : (
            <div className="grid gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 text-left transition",
                    branchId === b.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.address}, {b.city}
                    </p>
                    {b.hours ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.hours}
                      </p>
                    ) : null}
                  </div>
                  {branchId === b.id ? (
                    <Badge variant="default">Elegida</Badge>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {state?.errors?.address_id?.[0] ? (
        <p className="text-xs text-destructive">
          {state.errors.address_id[0]}
        </p>
      ) : null}
      {state?.errors?.branch_id?.[0] ? (
        <p className="text-xs text-destructive">
          {state.errors.branch_id[0]}
        </p>
      ) : null}
    </>
  );
}

function Summary({
  items,
  subtotal,
  rawShipping,
  shipping,
  subtotalDiscount,
  total,
  fulfillment,
  promos,
  appliedCode,
  onApplyCode,
  onRemoveCode,
}: {
  items: CartItem[];
  subtotal: number;
  rawShipping: number;
  shipping: number;
  subtotalDiscount: number;
  total: number;
  fulfillment: "ship" | "pickup";
  promos: ReturnType<typeof evaluatePromotions>;
  appliedCode: AppliedCode | null;
  onApplyCode: (a: AppliedCode) => void;
  onRemoveCode: () => void;
}) {
  void rawShipping;
  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {i.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={i.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium leading-tight">{i.product_name}</p>
                {i.variant_name ? (
                  <p className="text-xs text-muted-foreground">
                    {i.variant_name}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {i.quantity} × {formatMXN(Number(i.unit_price))}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {formatMXN(Number(i.unit_price) * Number(i.quantity))}
              </p>
            </li>
          ))}
        </ul>
        <PromotionsSummary result={promos} />
        <div className="border-t border-border pt-3">
          <PromoCodeInput
            cartSubtotal={subtotal}
            shippingCost={rawShipping}
            applied={appliedCode}
            onApply={onApplyCode}
            onRemove={onRemoveCode}
          />
        </div>
        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatMXN(subtotal)}</span>
          </div>
          {subtotalDiscount > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>Descuentos</span>
              <span className="font-medium">-{formatMXN(subtotalDiscount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Envío
              {fulfillment === "pickup" ? (
                <span className="ml-1 text-xs">(recoger en sucursal)</span>
              ) : null}
            </span>
            <span className="font-medium">
              {shipping === 0 ? "Gratis" : formatMXN(shipping)}
            </span>
          </div>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-base font-semibold">Total</span>
          <span className="text-xl font-bold">{formatMXN(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FulfillmentCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition disabled:opacity-50",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40",
      )}
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function AddressPreview({ address }: { address: Address }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
      <p className="font-medium">{address.recipient}</p>
      <p className="text-muted-foreground">
        {address.street} {address.ext_number ?? ""} · {address.zip}{" "}
        {address.city}, {address.state}
      </p>
    </div>
  );
}

function ContinueButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full gap-2"
      disabled={pending || disabled}
    >
      {pending ? "Reservando pedido..." : "Continuar al pago"}
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}
