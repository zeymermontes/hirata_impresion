import Link from "next/link";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { AddressList } from "@/app/(storefront)/mi-cuenta/direcciones/_components/address-list";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Direcciones" };

type SearchParams = Promise<{ next?: string }>;

// Whitelist the URLs we accept as `next` to avoid open-redirect issues.
const SAFE_NEXT_PATHS = ["/checkout"];

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;
  const redirectTo = next && SAFE_NEXT_PATHS.includes(next) ? next : undefined;

  const { supabase, user } = await requireUser();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      {redirectTo === "/checkout" ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="flex items-start gap-2 text-amber-900">
            <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Agrega una dirección de envío</p>
              <p className="text-amber-800">
                La necesitamos para terminar tu compra. En cuanto guardes,
                regresarás al checkout automáticamente.
              </p>
            </div>
          </div>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-1 text-xs text-amber-900 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Volver al checkout
          </Link>
        </div>
      ) : null}

      <header>
        <h2 className="text-xl font-bold tracking-tight">Mis direcciones</h2>
        <p className="text-sm text-muted-foreground">
          Guarda direcciones para usarlas rápido en el checkout.
        </p>
      </header>
      <AddressList addresses={addresses ?? []} redirectTo={redirectTo} />
    </div>
  );
}
