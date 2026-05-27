"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  loginAction,
  signupAction,
  recoverAction,
  type AuthState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup" | "recover";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Procesando..." : label}
    </Button>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const action =
    mode === "login"
      ? loginAction
      : mode === "signup"
        ? signupAction
        : recoverAction;

  const [state, formAction] = useActionState<AuthState | undefined, FormData>(
    action,
    undefined,
  );

  const fieldErrors = state?.errors;

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {mode === "signup" ? (
        <Field
          name="full_name"
          label="Nombre completo"
          autoComplete="name"
          required
          error={fieldErrors?.full_name?.[0]}
        />
      ) : null}

      <Field
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        error={fieldErrors?.email?.[0]}
      />

      {mode !== "recover" ? (
        <Field
          name="password"
          label="Contraseña"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          error={fieldErrors?.password?.[0]}
        />
      ) : null}

      {state?.message ? (
        <p
          className={
            state.ok
              ? "rounded-md bg-accent p-3 text-sm text-accent-foreground"
              : "rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton
        label={
          mode === "login"
            ? "Entrar"
            : mode === "signup"
              ? "Crear cuenta"
              : "Enviar correo"
        }
      />
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
