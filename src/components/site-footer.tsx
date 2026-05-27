import Link from "next/link";
import { HirataLogo } from "@/components/hirata-logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:px-8 md:grid-cols-4">
        <div className="space-y-3">
          <HirataLogo variant="inverse" />
          <p className="text-sm text-secondary-foreground/70 max-w-xs">
            Impresión digital profesional. Sube tu diseño y recibe en tu
            domicilio o recoge en sucursal.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">Productos</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/productos?categoria=lonas">Lonas</Link></li>
            <li><Link className="hover:text-primary" href="/productos?categoria=vinilos">Vinilos</Link></li>
            <li><Link className="hover:text-primary" href="/productos?categoria=papeleria">Papelería</Link></li>
            <li><Link className="hover:text-primary" href="/productos?categoria=senalizacion">Señalización</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">Tu cuenta</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/login">Iniciar sesión</Link></li>
            <li><Link className="hover:text-primary" href="/registro">Crear cuenta</Link></li>
            <li><Link className="hover:text-primary" href="/mi-cuenta/pedidos">Mis pedidos</Link></li>
            <li><Link className="hover:text-primary" href="/mi-cuenta/direcciones">Direcciones</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">Hirata</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/contacto">Contacto</Link></li>
            <li><Link className="hover:text-primary" href="/sucursales">Sucursales</Link></li>
            <li><Link className="hover:text-primary" href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
            <li><Link className="hover:text-primary" href="/aviso-privacidad">Aviso de privacidad</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 text-xs text-secondary-foreground/60">
          <span>© {new Date().getFullYear()} Hirata Impresión Digital.</span>
          <span>Hecho en México</span>
        </div>
      </div>
    </footer>
  );
}
