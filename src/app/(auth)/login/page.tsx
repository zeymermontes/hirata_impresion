import Link from "next/link";
import { AuthForm } from "@/app/(auth)/_components/auth-form";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accede a tu cuenta para ver tus pedidos y direcciones.
      </p>
      <AuthForm mode="login" />
      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/recuperar" className="hover:text-primary">
          Olvidé mi contraseña
        </Link>
        <Link href="/registro" className="font-medium hover:text-primary">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
