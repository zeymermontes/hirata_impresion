import Link from "next/link";
import { AuthForm } from "@/app/(auth)/_components/auth-form";

export const metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Guarda tus direcciones y consulta tus pedidos cuando quieras.
      </p>
      <AuthForm mode="signup" />
      <p className="mt-6 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-primary">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
