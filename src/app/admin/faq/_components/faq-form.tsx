"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createFaqAction,
  updateFaqAction,
  type FaqActionState,
} from "@/app/admin/faq/actions";

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  active: boolean;
};

export function FaqForm({ entry }: { entry?: FaqEntry }) {
  const action = entry ? updateFaqAction.bind(null, entry.id) : createFaqAction;
  const [state, formAction] = useActionState<
    FaqActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-1.5">
        <Label htmlFor="question">Pregunta</Label>
        <Input
          id="question"
          name="question"
          required
          defaultValue={entry?.question ?? ""}
          placeholder="Ej. ¿Cuánto tarda el envío?"
        />
        {state?.errors?.question?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.question[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="answer">Respuesta</Label>
        <Textarea
          id="answer"
          name="answer"
          rows={8}
          required
          defaultValue={entry?.answer ?? ""}
          placeholder="<p>El envío tarda de 3 a 5 días hábiles a la mayoría de la república. <a href='/contacto'>Pregúntanos</a> si tienes dudas.</p>"
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Acepta HTML simple (<code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code>,{" "}
          <code>&lt;a&gt;</code>, <code>&lt;strong&gt;</code>). Se inyecta tal
          cual en la página pública.
        </p>
        {state?.errors?.answer?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.answer[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="sort_order">Orden</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={entry?.sort_order ?? 0}
          />
          <p className="text-xs text-muted-foreground">
            Menor número aparece primero.
          </p>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <Checkbox
            name="active"
            defaultChecked={entry ? entry.active : true}
          />
          Visible en la tienda
        </label>
      </div>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton edit={Boolean(entry)} />
      </div>
    </form>
  );
}

function SubmitButton({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : edit ? "Guardar cambios" : "Crear pregunta"}
    </Button>
  );
}
