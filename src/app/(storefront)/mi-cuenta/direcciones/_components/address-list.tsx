"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressForm } from "@/app/(storefront)/mi-cuenta/direcciones/_components/address-form";
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/app/(storefront)/mi-cuenta/direcciones/actions";
import { cn } from "@/lib/utils";

type Address = {
  id: string;
  label: string;
  recipient: string;
  street: string;
  ext_number: string | null;
  int_number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  is_default: boolean;
};

export function AddressList({
  addresses,
  redirectTo,
}: {
  addresses: Address[];
  /** If set, after a successful CREATE we navigate here automatically. */
  redirectTo?: string;
}) {
  // When the user came from checkout with no addresses, open the form
  // automatically so they don't have to click "Agregar".
  const [adding, setAdding] = useState(
    Boolean(redirectTo) && addresses.length === 0,
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {addresses.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) =>
            editingId === a.id ? (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-card p-5 sm:col-span-2"
              >
                <h3 className="mb-3 text-sm font-semibold">
                  Editar dirección
                </h3>
                <AddressForm
                  address={a}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <AddressCard
                key={a.id}
                address={a}
                onEdit={() => setEditingId(a.id)}
              />
            ),
          )}
        </ul>
      ) : null}

      {adding ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Nueva dirección</h3>
          <AddressForm
            onDone={() => setAdding(false)}
            redirectTo={redirectTo}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <Plus className="h-4 w-4" /> Agregar nueva dirección
        </button>
      )}
    </div>
  );
}

function AddressCard({
  address,
  onEdit,
}: {
  address: Address;
  onEdit: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            {address.label}
            {address.is_default ? (
              <Badge variant="default">
                <Star className="h-3 w-3" /> Principal
              </Badge>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">{address.recipient}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {address.street} {address.ext_number ?? ""}
        {address.int_number ? `, Int. ${address.int_number}` : ""}
        {address.neighborhood ? `, ${address.neighborhood}` : ""}
        <br />
        {address.zip} {address.city}, {address.state}
        {address.phone ? (
          <>
            <br />
            Tel: {address.phone}
          </>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        {!address.is_default ? (
          <form action={setDefaultAddressAction.bind(null, address.id)}>
            <Button variant="ghost" size="sm" type="submit" className="gap-1">
              <Star className="h-3.5 w-3.5" /> Hacer principal
            </Button>
          </form>
        ) : null}
        <form action={deleteAddressAction.bind(null, address.id)}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              if (!confirm("¿Eliminar esta dirección?")) e.preventDefault();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </form>
      </div>
    </li>
  );
}
