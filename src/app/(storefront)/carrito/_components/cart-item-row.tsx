"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { Trash2, Minus, Plus } from "lucide-react";
import {
  removeCartItem,
  updateCartItemQty,
} from "@/app/(storefront)/carrito/actions";
import { formatMXN } from "@/lib/utils";

type Props = {
  id: string;
  productSlug: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
  uploadedFileUrl: string | null;
  customization: Record<string, unknown> | null;
};

export function CartItemRow({
  id,
  productSlug,
  productName,
  variantName,
  quantity,
  unitPrice,
  imageUrl,
  uploadedFileUrl,
  customization,
}: Props) {
  const [qty, setQty] = useState(quantity);
  const [pending, start] = useTransition();

  function changeQty(next: number) {
    const v = Math.max(1, Math.min(999, next));
    setQty(v);
    start(() => updateCartItemQty(id, v));
  }

  return (
    <div className="flex gap-4 py-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            {productSlug ? (
              <Link
                href={`/productos/${productSlug}`}
                className="font-medium hover:text-primary"
              >
                {productName}
              </Link>
            ) : (
              <p className="font-medium">{productName}</p>
            )}
            {variantName ? (
              <p className="text-xs text-muted-foreground">{variantName}</p>
            ) : null}
            {uploadedFileUrl ? (
              <a
                href={uploadedFileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Ver archivo subido
              </a>
            ) : null}
            {customization && Object.keys(customization).length > 0 ? (
              <CustomizationSummary data={customization} />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => start(() => removeCartItem(id))}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Quitar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div className="inline-flex items-center rounded-md border border-border">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center hover:bg-muted disabled:opacity-50"
              onClick={() => changeQty(qty - 1)}
              disabled={pending || qty <= 1}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              value={qty}
              onChange={(e) => changeQty(Number(e.target.value) || 1)}
              className="h-8 w-12 border-x border-border bg-transparent text-center text-sm focus:outline-none"
            />
            <button
              type="button"
              className="grid h-8 w-8 place-items-center hover:bg-muted disabled:opacity-50"
              onClick={() => changeQty(qty + 1)}
              disabled={pending}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="font-semibold">{formatMXN(unitPrice * qty)}</p>
        </div>
      </div>
    </div>
  );
}

function CustomizationSummary({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.length > 0;
    return true;
  });
  if (entries.length === 0) return null;
  return (
    <dl className="mt-1 space-y-0.5 text-xs">
      {entries.map(([key, value]) => {
        if (key.endsWith("__url")) {
          const label = key.slice(0, -"__url".length);
          return (
            <div key={key} className="flex gap-1.5">
              <dt className="text-muted-foreground capitalize">{label}:</dt>
              <dd>
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Ver archivo
                </a>
              </dd>
            </div>
          );
        }
        return (
          <div key={key} className="flex gap-1.5">
            <dt className="text-muted-foreground capitalize">{key}:</dt>
            <dd className="truncate">{String(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
