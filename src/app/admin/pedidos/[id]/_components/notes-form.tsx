"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateOrderNotesAction,
  type OrderActionState,
} from "@/app/admin/pedidos/actions";

export function NotesForm({
  orderId,
  initialNotes,
}: {
  orderId: string;
  initialNotes: string | null;
}) {
  const action = updateOrderNotesAction.bind(null, orderId);
  const [state, formAction] = useActionState<
    OrderActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor="notes">Notas internas (no visibles al cliente)</Label>
      <Textarea
        id="notes"
        name="notes"
        rows={4}
        defaultValue={initialNotes ?? ""}
        placeholder="Indicaciones para producción, observaciones, etc."
      />
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
      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando..." : "Guardar notas"}
    </Button>
  );
}
