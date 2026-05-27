@AGENTS.md

# Hirata — guía rápida para Claude

E-commerce para imprenta digital en México (marca: **Hirata Impresión Digital**, colores negro/blanco/amarillo).

## Stack y convenciones
- **Next.js 16** (App Router, RSC por defecto). `middleware.ts` ahora se llama `proxy.ts` y vive en `src/proxy.ts`. `cookies()`/`headers()` son async.
- **Tailwind v4**: tokens en `src/app/globals.css` con `@theme inline`. No hay `tailwind.config.js`. Usa tokens `bg-primary`, `bg-secondary`, `bg-muted`, `text-foreground`, etc.
- **Supabase**: el cliente correcto depende del contexto.
  - Server Components / Server Actions / Route Handlers → `await createClient()` de `@/lib/supabase/server`
  - Componentes cliente → `createClient()` de `@/lib/supabase/client`
  - Operaciones privilegiadas (service-role) → `createAdminClient()` de `@/lib/supabase/admin`
- **Auth con Server Actions + Zod** en `src/app/(auth)/actions.ts`. No usar API routes para auth.
- **Roles**: `profiles.role` con `'customer' | 'admin'`. El proxy redirige `/admin/*` si no es admin. RLS replica la regla en DB.
- **Idioma UI**: español (mx). Precios con `formatMXN()` en `@/lib/utils`.

## Estructura de rutas
- `app/(storefront)/` — público con header/footer (landing, productos, carrito, mi-cuenta).
- `app/(auth)/` — layout centrado para login/registro/recuperar.
- `app/admin/` — sidebar admin, protegido por proxy + guard en el layout.
- `app/auth/callback/route.ts` — exchange de código de confirmación.

## Cambios al schema
Cada cambio va en una nueva migración numerada (`supabase/migrations/00NN_descripcion.sql`). Después actualizar `src/lib/supabase/database.types.ts` a mano o regenerar con `supabase gen types typescript --linked`.

## Storage
- `public-assets` (público): banners, fotos de producto, templates. Solo admin escribe.
- `customer-uploads` (privado): archivos del cliente bajo `{user_id}/...`. RLS en `0003_storage_buckets.sql`.
