# Hirata Impresión Digital

E-commerce para imprenta digital — catálogo, personalización en vivo, carrito, checkout con MercadoPago, envío o recolección en sucursal, y panel admin.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (auth, Postgres, storage) · MercadoPago · Resend (opcional).

## Estado actual — Fase 1 ✅

- Proyecto Next.js 16 inicializado con TypeScript y Tailwind v4
- Branding Hirata (negro / blanco / amarillo) configurado en `globals.css`
- Componentes base (`Button`, `Input`, `Label`) y logo
- Header con detección de admin + footer
- Landing dinámica que lee `banners`, `categories` y `products` de Supabase
- Páginas de auth: login, registro, recuperar contraseña (con Server Actions + Zod)
- `proxy.ts` (Next 16 renombró middleware) que refresca la sesión y gate-a `/admin` y `/mi-cuenta`
- Layout y dashboard del panel admin
- Migraciones SQL completas: schema, RLS, storage buckets, datos seed

## Setup local

### 1. Variables de entorno

```bash
cp .env.example .env.local
```

Llena estos valores en `.env.local`:

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (¡secreto!) |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago → Tus integraciones → Credenciales |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | MercadoPago → Credenciales |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en dev, tu dominio en prod |

### 2. Aplicar migraciones a Supabase

Desde el dashboard de Supabase (SQL Editor) ejecuta en orden:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_storage_buckets.sql`
4. (Opcional) `supabase/seed.sql` para tener categorías, banners y secciones de ejemplo.

> Alternativa con CLI: `supabase link --project-ref <ref>` y luego `supabase db push`.

### 3. Crear el primer admin

a) Registra una cuenta en `http://localhost:3000/registro` y confirma tu correo.

b) En Supabase SQL Editor, promueve al usuario:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'tu@correo.com');
```

Al hacer login verás el botón **Admin** en el header.

### 4. Correr en dev

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Estructura

```
src/
├── app/
│   ├── (auth)/              login, registro, recuperar (layout centrado)
│   ├── (storefront)/        landing, productos, carrito, mi-cuenta
│   ├── admin/               panel admin con sidebar
│   ├── auth/callback/       handler de magic links / confirmaciones
│   ├── layout.tsx           root layout (fonts, metadata)
│   └── globals.css          Tailwind v4 + tokens de branding Hirata
├── components/
│   ├── ui/                  Button, Input, Label
│   ├── hirata-logo.tsx
│   ├── site-header.tsx
│   └── site-footer.tsx
├── lib/
│   ├── env.ts
│   ├── utils.ts             cn(), formatMXN()
│   └── supabase/
│       ├── client.ts        Componentes cliente
│       ├── server.ts        Server Components / Actions
│       ├── admin.ts         service-role (solo server)
│       ├── proxy.ts         helper para el proxy
│       └── database.types.ts
└── proxy.ts                 antes "middleware" — gate de roles y refresh
supabase/
├── migrations/0001..0003.sql
└── seed.sql
```

## Roadmap

- **Fase 2** — Catálogo: CRUD admin (categorías, productos, banners), página de catálogo y detalle, carrito con merge guest→user.
- **Fase 3** — Personalización: campos editables por producto + editor con canvas (Konva) con preview en vivo + uploads a `customer-uploads`.
- **Fase 4** — Checkout: direcciones, sucursales, MercadoPago + webhooks + email transaccional.
- **Fase 5** — Admin de pedidos, dashboard con métricas, promociones/cupones, SEO + sitemap.

## Notas de Next.js 16

Esta versión introduce cambios respecto a Next 14/15:

- `middleware.ts` → **`proxy.ts`** (misma funcionalidad, mejor nombre).
- `cookies()` y `headers()` son **async** (deben usarse con `await`).
- Tailwind v4 — la configuración vive en **CSS** (`@theme inline { ... }`), no en `tailwind.config.js`.
