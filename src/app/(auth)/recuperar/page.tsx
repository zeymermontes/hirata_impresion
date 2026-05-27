import Link from "next/link";
import { AuthForm } from "@/app/(auth)/_components/auth-form";

export const metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">
        Recuperar contraseña
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Te enviaremos un correo con un enlace para restablecerla.
      </p>
      <AuthForm mode="recover" />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground hover:text-primary">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
