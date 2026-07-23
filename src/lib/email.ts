import "server-only";
import { Resend } from "resend";
import { env, serverOnlyEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GiftCard } from "@/lib/gift-cards";

// ============================================================
// Brand tokens — Hirata: black foreground + yellow accent
// ============================================================
// Yellow (#facc15) reads poorly as foreground text on white, so we
// reserve it for visual elements (stripes, left-borders, code-chip
// backgrounds, the gift-card balance gradient). Foreground accent
// text and button backgrounds use black for readability.

const ACCENT_YELLOW = "#facc15";
const BLACK = "#0a0a0a";
const CREAM_BG = "#fffbeb";
const CREAM_BORDER = "#fef3c7";

// ============================================================
// Brand contact (WhatsApp, support email) — loaded once per process
// ============================================================
// The sending mailbox is a no-reply, so every body copy needs to point
// customers at a real contact channel. WhatsApp is the primary support
// channel; the support email stays in the footer as a secondary option.
// Process-wide cache because email rendering happens in hot paths
// (webhooks, status transitions) and site_settings rarely changes.

type EmailContact = {
  /** Digits only — used to build wa.me links. */
  whatsapp: string;
  /** Human-readable form, shown in copy. */
  whatsapp_label: string;
  /** Support inbox shown alongside WhatsApp in the footer. */
  email: string;
};

const CONTACT_FALLBACK: EmailContact = {
  whatsapp: "525512345678",
  whatsapp_label: "+52 55 1234 5678",
  email: "hola@hirata.mx",
};

let cachedContact: EmailContact | null = null;

async function loadContact(): Promise<EmailContact> {
  if (cachedContact) return cachedContact;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "contact")
      .maybeSingle();
    const v = (data?.value as Record<string, unknown> | undefined) ?? {};
    cachedContact = {
      whatsapp:
        typeof v.whatsapp === "string" && v.whatsapp.length > 0
          ? v.whatsapp
          : CONTACT_FALLBACK.whatsapp,
      whatsapp_label:
        typeof v.whatsapp_label === "string" && v.whatsapp_label.length > 0
          ? v.whatsapp_label
          : CONTACT_FALLBACK.whatsapp_label,
      email:
        typeof v.email === "string" && v.email.length > 0
          ? v.email
          : CONTACT_FALLBACK.email,
    };
  } catch {
    cachedContact = CONTACT_FALLBACK;
  }
  return cachedContact;
}

function waLink(whatsapp: string, prefill?: string): string {
  const q = prefill ? `?text=${encodeURIComponent(prefill)}` : "";
  return `https://wa.me/${whatsapp}${q}`;
}

function siteBase(): string {
  return env.SITE_URL.replace(/\/$/, "");
}

/**
 * Inline "Escríbenos por WhatsApp" footer fragment for body copy. The
 * `prefill` text is dropped into the WhatsApp message so the customer
 * doesn't have to type any context.
 */
function whatsappHelpLine(contact: EmailContact, prefill: string): string {
  return `Si tienes alguna duda, escríbenos por WhatsApp al
    <a href="${waLink(contact.whatsapp, prefill)}" style="color:${BLACK};text-decoration:none;font-weight:600;">${escapeHtml(contact.whatsapp_label)}</a>.`;
}

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const { RESEND_API_KEY } = serverOnlyEnv();
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith("re_xxxx")) {
    // Treat unset / placeholder as "email disabled" so local dev doesn't
    // throw — emails are best-effort and we log a warning instead.
    return null;
  }
  cachedClient = new Resend(RESEND_API_KEY);
  return cachedClient;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const client = getClient();
  if (!client) {
    console.warn(
      `[email] skipping send to ${args.to} — RESEND_API_KEY not configured`,
    );
    return { ok: false, reason: "no_api_key" };
  }
  const { EMAIL_FROM } = serverOnlyEnv();
  console.info(
    `[email] sending → to="${args.to}" from="${EMAIL_FROM}" subject="${args.subject}"`,
  );
  try {
    const result = await client.emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (result.error) {
      console.error(
        `[email] resend rejected → to="${args.to}":`,
        result.error,
      );
      return { ok: false, reason: result.error.message };
    }
    console.info(
      `[email] sent → to="${args.to}" id=${result.data?.id ?? "(no id)"}`,
    );
    return { ok: true, id: result.data?.id };
  } catch (e) {
    console.error(`[email] resend threw → to="${args.to}":`, e);
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

// ============================================================
// Brand shell — every email passes through this
// ============================================================

/**
 * Wraps any email body in the brand chrome: white card on cream
 * background, white logo header with a yellow accent stripe, footer
 * with no-reply notice + WhatsApp link + country tag.
 *
 * Clients block remote images by default, so we provide alt text plus
 * a tagline directly underneath so the brand reads either way.
 */
function shell(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  contact: EmailContact;
}): string {
  const logoUrl = `${siteBase()}/hirata-logo.webp`;
  const productsUrl = `${siteBase()}/productos`;
  const whatsappUrl = waLink(opts.contact.whatsapp);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BLACK};-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden but shown as preview in inbox lists) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(10,10,10,0.06);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 24px 16px 24px;background:#ffffff;border-bottom:3px solid ${ACCENT_YELLOW};">
              <img src="${logoUrl}" width="180" alt="Hirata" style="display:block;max-width:180px;height:auto;margin:0 auto 8px auto;border:0;" />
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BLACK};">Hirata · Impresión Digital</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              ${opts.bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 24px;background:${CREAM_BG};border-top:1px solid ${CREAM_BORDER};text-align:center;">
              <p style="margin:0 0 8px 0;font-size:11px;color:#9ca3af;">
                Este correo se envía desde una dirección no monitoreada. Para soporte escríbenos por WhatsApp.
              </p>
              <p style="margin:0 0 6px 0;font-size:13px;color:${BLACK};">
                <a href="${whatsappUrl}" style="color:${BLACK};text-decoration:none;font-weight:700;">💬 WhatsApp ${escapeHtml(opts.contact.whatsapp_label)}</a>
              </p>
              <p style="margin:0 0 8px 0;font-size:11px;color:#9ca3af;">
                <a href="${productsUrl}" style="color:${BLACK};text-decoration:none;font-weight:600;">hirata.mx</a>
              </p>
              <p style="margin:0;font-size:11px;color:#6b7280;">
                Hecho con cariño en México 🇲🇽
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
    <tr>
      <td align="center" style="border-radius:12px;background:${BLACK};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:0.02em;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function orderChip(orderShort: string): string {
  return `<span style="font-family:monospace;background:${CREAM_BG};padding:2px 6px;border-radius:4px;color:${BLACK};font-weight:600;border:1px solid ${CREAM_BORDER};">#${escapeHtml(orderShort)}</span>`;
}

// ============================================================
// Welcome — after signup confirmation
// ============================================================

export async function sendWelcomeEmail(args: {
  to: string;
  name: string | null;
}): Promise<void> {
  const contact = await loadContact();
  const html = renderWelcomeEmail(args, contact);
  await sendEmail({
    to: args.to,
    subject: "¡Bienvenido a Hirata! ✨",
    html,
  });
}

function renderWelcomeEmail(
  args: { name: string | null },
  contact: EmailContact,
): string {
  const greeting = args.name ? `¡Hola ${escapeHtml(args.name)}!` : "¡Hola!";
  const ctaUrl = `${siteBase()}/productos`;

  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#525252;">${greeting}</p>
    <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;line-height:1.2;color:${BLACK};">
      Bienvenido a Hirata 🖨️
    </h1>
    <p style="margin:0 0 20px 0;font-size:15px;color:#3f3f46;line-height:1.6;">
      Gracias por crear tu cuenta. Aquí imprimimos lo que necesitas: tarjetas,
      stickers, lonas, libretas, gift cards y más — todo con acabados
      profesionales y entrega rápida.
    </p>

    <div style="margin:24px 0;padding:20px;background:${CREAM_BG};border-radius:12px;border-left:4px solid ${ACCENT_YELLOW};">
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:${BLACK};">¿Por dónde empezar?</p>
      <p style="margin:0;font-size:13px;color:#525252;line-height:1.5;">Explora el catálogo, personaliza tu diseño en vivo y pídelo en minutos.</p>
    </div>

    ${button("Explorar productos", ctaUrl)}

    <p style="margin:24px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      ${whatsappHelpLine(contact, "Hola, acabo de crear mi cuenta en Hirata y tengo una duda")}
    </p>
  `;

  return shell({
    preheader: "Empieza a imprimir en minutos",
    title: "Bienvenido a Hirata",
    bodyHtml: body,
    contact,
  });
}

// ============================================================
// Order paid
// ============================================================

export type OrderEmailItem = {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
};

export async function sendOrderPaidEmail(args: {
  to: string;
  name: string | null;
  orderId: string;
  items: OrderEmailItem[];
  total: number;
  fulfillment: "ship" | "pickup" | "digital";
}): Promise<void> {
  const contact = await loadContact();
  const html = renderOrderPaidEmail(args, contact);
  await sendEmail({
    to: args.to,
    subject: `¡Recibimos tu pago! Pedido #${args.orderId.slice(0, 8)}`,
    html,
  });
}

function renderOrderPaidEmail(
  args: {
    name: string | null;
    orderId: string;
    items: OrderEmailItem[];
    total: number;
    fulfillment: "ship" | "pickup" | "digital";
  },
  contact: EmailContact,
): string {
  const greeting = args.name ? `¡Gracias ${escapeHtml(args.name)}!` : "¡Gracias!";
  const orderShort = args.orderId.slice(0, 8);
  const orderUrl = `${siteBase()}/mi-cuenta/pedidos/${args.orderId}`;

  const rows = args.items
    .map(
      (it) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${CREAM_BORDER};">
          <p style="margin:0;font-size:14px;color:${BLACK};font-weight:600;">${escapeHtml(it.product_name)}</p>
          ${it.variant_name ? `<p style="margin:2px 0 0 0;font-size:12px;color:#71717a;">${escapeHtml(it.variant_name)}</p>` : ""}
          <p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af;">${it.quantity} × ${formatPeso(Number(it.unit_price))}</p>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${CREAM_BORDER};text-align:right;font-weight:700;color:${BLACK};font-size:14px;">
          ${formatPeso(Number(it.unit_price) * Number(it.quantity))}
        </td>
      </tr>`,
    )
    .join("");

  const nextStep =
    args.fulfillment === "digital"
      ? "Como es entrega digital, recibirás cada ítem directamente por correo en los próximos minutos."
      : args.fulfillment === "pickup"
        ? "Tu pedido entró en producción. Te avisamos cuando esté listo para recoger en sucursal."
        : "Tu pedido entró en producción. Te enviaremos otro correo con el número de guía cuando salga a tu domicilio.";

  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#525252;">${greeting}</p>
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;line-height:1.2;color:${BLACK};">
      Recibimos tu pago ✅
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#3f3f46;line-height:1.5;">
      Pedido ${orderChip(orderShort)}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:8px;">
      ${rows}
      <tr>
        <td style="padding:16px 0 0 0;font-size:13px;color:#525252;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Total</td>
        <td style="padding:16px 0 0 0;font-size:18px;font-weight:800;text-align:right;color:${BLACK};">${formatPeso(args.total)}</td>
      </tr>
    </table>

    <p style="margin:24px 0 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">${nextStep}</p>

    ${button("Ver mi pedido", orderUrl)}

    <p style="margin:24px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      ${whatsappHelpLine(contact, `Hola, tengo una duda sobre mi pedido #${orderShort}`)}
    </p>
  `;

  return shell({
    preheader: `Pago confirmado — pedido #${orderShort}`,
    title: "Pago recibido",
    bodyHtml: body,
    contact,
  });
}

// ============================================================
// Order shipped
// ============================================================

export async function sendOrderShippedEmail(args: {
  to: string;
  name: string | null;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}): Promise<void> {
  const contact = await loadContact();
  const html = renderOrderShippedEmail(args, contact);
  await sendEmail({
    to: args.to,
    subject: `📦 ¡Tu pedido va en camino! #${args.orderId.slice(0, 8)}`,
    html,
  });
}

function renderOrderShippedEmail(
  args: {
    name: string | null;
    orderId: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
  },
  contact: EmailContact,
): string {
  const greeting = args.name ? `¡Hola ${escapeHtml(args.name)}!` : "¡Hola!";
  const orderShort = args.orderId.slice(0, 8);
  const orderUrl = `${siteBase()}/mi-cuenta/pedidos/${args.orderId}`;

  const trackingBlock = args.trackingNumber
    ? `<div style="margin:24px 0;padding:20px;background:${CREAM_BG};border-radius:12px;border-left:4px solid ${ACCENT_YELLOW};">
        ${args.carrier ? `<p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:${BLACK};letter-spacing:0.06em;text-transform:uppercase;">Paquetería</p>
        <p style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:${BLACK};">${escapeHtml(args.carrier)}</p>` : ""}
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:${BLACK};letter-spacing:0.06em;text-transform:uppercase;">Número de guía</p>
        <p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;color:${BLACK};letter-spacing:0.04em;">${escapeHtml(args.trackingNumber)}</p>
      </div>`
    : "";

  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#525252;">${greeting}</p>
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;line-height:1.2;color:${BLACK};">
      Tu pedido salió 📦
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;color:#3f3f46;line-height:1.5;">
      Pedido ${orderChip(orderShort)} ya está en camino a tu domicilio.
    </p>

    ${trackingBlock}

    ${args.trackingUrl ? button("Rastrear envío", args.trackingUrl) : button("Ver mi pedido", orderUrl)}

    <p style="margin:24px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      ${whatsappHelpLine(contact, `Hola, tengo una duda con el envío de mi pedido #${orderShort}`)}
    </p>
  `;

  return shell({
    preheader: `Tu pedido va en camino${args.trackingNumber ? ` — guía ${args.trackingNumber}` : ""}`,
    title: "Tu pedido va en camino",
    bodyHtml: body,
    contact,
  });
}

// ============================================================
// Order ready for pickup
// ============================================================

export type BranchScheduleLine = {
  day: string;
  value: string;
  closed: boolean;
};

export async function sendOrderReadyEmail(args: {
  to: string;
  name: string | null;
  orderId: string;
  branchName: string | null;
  branchAddress: string | null;
  /**
   * Structured weekly schedule rendered as a table (one row per day).
   * Use this when the branch has `hours_schedule` configured.
   */
  branchSchedule: BranchScheduleLine[] | null;
  /**
   * Free-form legacy `branches.hours` text — fallback for branches not
   * yet migrated through the new admin editor. Ignored when
   * `branchSchedule` is present.
   */
  branchHours: string | null;
}): Promise<void> {
  const contact = await loadContact();
  const html = renderOrderReadyEmail(args, contact);
  await sendEmail({
    to: args.to,
    subject: `🎁 Tu pedido está listo para recoger #${args.orderId.slice(0, 8)}`,
    html,
  });
}

function renderOrderReadyEmail(
  args: {
    name: string | null;
    orderId: string;
    branchName: string | null;
    branchAddress: string | null;
    branchSchedule: BranchScheduleLine[] | null;
    branchHours: string | null;
  },
  contact: EmailContact,
): string {
  const greeting = args.name ? `¡Hola ${escapeHtml(args.name)}!` : "¡Hola!";
  const orderShort = args.orderId.slice(0, 8);
  const orderUrl = `${siteBase()}/mi-cuenta/pedidos/${args.orderId}`;

  // Prefer the structured schedule rendered as a weekly table — much
  // easier to scan than a comma-joined line. Falls back to the legacy
  // `branches.hours` free-form text if no schedule was configured.
  const scheduleHtml =
    args.branchSchedule && args.branchSchedule.length > 0
      ? `<p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:${BLACK};letter-spacing:0.06em;text-transform:uppercase;">Horario de la sucursal</p>
         <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0;">
           ${args.branchSchedule
             .map(
               (l) => `<tr>
                 <td style="padding:3px 0;font-size:13px;color:#71717a;width:35%;">${escapeHtml(l.day)}</td>
                 <td style="padding:3px 0;font-size:13px;color:${l.closed ? "#9ca3af" : BLACK};font-style:${l.closed ? "italic" : "normal"};font-weight:${l.closed ? "400" : "600"};">${escapeHtml(l.value)}</td>
               </tr>`,
             )
             .join("")}
         </table>`
      : args.branchHours
        ? `<p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:${BLACK};letter-spacing:0.06em;text-transform:uppercase;">Horario</p>
           <p style="margin:0;font-size:13px;color:#525252;">${escapeHtml(args.branchHours)}</p>`
        : "";

  const branchBlock =
    args.branchName || args.branchAddress || scheduleHtml
      ? `<div style="margin:24px 0;padding:20px;background:${CREAM_BG};border-radius:12px;border-left:4px solid ${ACCENT_YELLOW};">
          ${args.branchName ? `<p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:${BLACK};letter-spacing:0.06em;text-transform:uppercase;">Sucursal</p>
          <p style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:${BLACK};">${escapeHtml(args.branchName)}</p>` : ""}
          ${args.branchAddress ? `<p style="margin:0 0 16px 0;font-size:14px;color:#3f3f46;line-height:1.5;">${escapeHtml(args.branchAddress)}</p>` : ""}
          ${scheduleHtml}
        </div>`
      : "";

  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#525252;">${greeting}</p>
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;line-height:1.2;color:${BLACK};">
      ¡Tu pedido está listo! 🎁
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;color:#3f3f46;line-height:1.5;">
      Pedido ${orderChip(orderShort)} ya está listo para que lo recojas.
    </p>

    ${branchBlock}

    ${button("Ver mi pedido", orderUrl)}

    <p style="margin:24px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      Lleva una identificación al recoger. ${whatsappHelpLine(contact, `Hola, voy a recoger mi pedido #${orderShort} y tengo una duda`)}
    </p>
  `;

  return shell({
    preheader: `Tu pedido #${orderShort} está listo para recoger`,
    title: "Tu pedido está listo",
    bodyHtml: body,
    contact,
  });
}

// ============================================================
// Gift card — to the recipient
// ============================================================

export async function sendGiftCardEmail(card: GiftCard): Promise<void> {
  if (!card.recipient_email) return;
  const contact = await loadContact();
  const subject = `${
    card.sender_name ? `${card.sender_name} te envió` : "Tienes"
  } una gift card de Hirata`;
  const html = renderGiftCardEmail(card, contact);
  await sendEmail({ to: card.recipient_email, subject, html });
}

function renderGiftCardEmail(card: GiftCard, contact: EmailContact): string {
  const amountFmt = formatPeso(card.initial_amount);
  const expires = card.expires_at
    ? new Date(card.expires_at).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;
  const greeting = card.recipient_name
    ? `¡Hola ${escapeHtml(card.recipient_name)}!`
    : "¡Hola!";
  const sender = card.sender_name
    ? `<p style="margin:0 0 16px 0;font-size:14px;color:#525252;">De parte de <strong style="color:${BLACK};">${escapeHtml(card.sender_name)}</strong>.</p>`
    : "";
  const message = card.message
    ? `<blockquote style="margin:20px 0;padding:14px 18px;border-left:4px solid ${ACCENT_YELLOW};background:${CREAM_BG};color:#3f3f46;font-style:italic;font-size:14px;border-radius:0 8px 8px 0;">${escapeHtml(card.message)}</blockquote>`
    : "";
  const expiresLine = expires
    ? `<p style="margin:8px 0 0 0;font-size:12px;color:#71717a;text-align:center;">Vigencia hasta el ${expires}</p>`
    : "";

  const productsUrl = `${siteBase()}/productos`;

  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#525252;">${greeting}</p>
    <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;line-height:1.2;color:${BLACK};">Tienes una gift card 🎁</h1>
    ${sender}
    ${message}

    <div style="margin:28px 0;padding:24px 20px;border-radius:16px;background:linear-gradient(135deg,${ACCENT_YELLOW} 0%,#eab308 100%);color:${BLACK};text-align:center;box-shadow:0 8px 24px rgba(250,204,21,0.3);">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">Saldo disponible</p>
      <p style="margin:8px 0 18px 0;font-size:42px;font-weight:800;line-height:1;">${amountFmt}</p>
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">Tu código</p>
      <p style="margin:6px 0 0 0;font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(card.code)}</p>
    </div>

    ${button("Usar mi gift card", productsUrl)}

    <p style="margin:16px 0 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">
      Aplica el código en el checkout. Puedes usarlo en varios pedidos hasta agotar el saldo.
    </p>
    ${expiresLine}
  `;

  return shell({
    preheader: `Saldo de ${amountFmt} — código ${card.code}`,
    title: "Tu gift card",
    bodyHtml: body,
    contact,
  });
}

// ============================================================
// Gift card — to the buyer, after their order pays
// ============================================================

export type BuyerGiftCardIssued = {
  amount: number;
  recipient_email: string | null;
  recipient_name: string | null;
  delivery_method: "email" | "physical";
};

export async function sendBuyerGiftCardConfirmation(args: {
  buyerEmail: string;
  buyerName: string | null;
  orderId: string;
  cards: BuyerGiftCardIssued[];
}): Promise<void> {
  if (!args.cards.length) return;
  const contact = await loadContact();
  const count = args.cards.length;
  const subject =
    count === 1
      ? "¡Tu gift card está en camino!"
      : `¡Tus ${count} gift cards están en camino!`;
  const html = renderBuyerConfirmationEmail(args, contact);
  await sendEmail({ to: args.buyerEmail, subject, html });
}

function renderBuyerConfirmationEmail(
  args: {
    buyerName: string | null;
    orderId: string;
    cards: BuyerGiftCardIssued[];
  },
  contact: EmailContact,
): string {
  const greeting = args.buyerName
    ? `¡Gracias ${escapeHtml(args.buyerName)}!`
    : "¡Gracias!";
  const total = args.cards.reduce((s, c) => s + Number(c.amount), 0);
  const totalFmt = formatPeso(total);
  const orderShort = args.orderId.slice(0, 8);
  const single = args.cards.length === 1;

  const rows = args.cards
    .map((c) => {
      const who = c.recipient_name
        ? escapeHtml(c.recipient_name)
        : c.recipient_email
          ? escapeHtml(c.recipient_email)
          : "destinatario";
      const where = c.recipient_email
        ? `<br><span style="color:#9ca3af;font-size:12px;">${escapeHtml(c.recipient_email)}</span>`
        : "";
      const channel =
        c.delivery_method === "physical"
          ? "🚚 Tarjeta física"
          : "✉️ Por correo electrónico";
      return `<tr>
        <td style="padding:14px 0;border-bottom:1px solid ${CREAM_BORDER};">
          <p style="margin:0;font-size:14px;color:${BLACK};font-weight:600;">${who}</p>
          ${where}
          <p style="margin:4px 0 0 0;font-size:11px;color:${BLACK};font-weight:600;letter-spacing:0.04em;">${channel}</p>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid ${CREAM_BORDER};text-align:right;font-weight:700;color:${BLACK};font-size:15px;">
          ${formatPeso(Number(c.amount))}
        </td>
      </tr>`;
    })
    .join("");

  const hasPhysical = args.cards.some((c) => c.delivery_method === "physical");
  const closing = hasPhysical
    ? "Las tarjetas digitales ya salieron al correo del destinatario. Las físicas se preparan y envían en los próximos días."
    : single
      ? "Ya salió al correo del destinatario."
      : "Ya salieron al correo de cada destinatario.";

  const body = `
    <p style="margin:0 0 6px 0;font-size:15px;color:#525252;">${greeting}</p>
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;line-height:1.2;color:${BLACK};">
      ${single ? "Tu gift card ya está en camino" : "Tus gift cards ya están en camino"}
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#3f3f46;line-height:1.5;">
      Gracias por tu compra. Aquí están los detalles de lo que enviamos:
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:8px;">
      ${rows}
      <tr>
        <td style="padding:16px 0 0 0;font-size:13px;color:#525252;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Total</td>
        <td style="padding:16px 0 0 0;font-size:18px;font-weight:800;text-align:right;color:${BLACK};">${totalFmt}</td>
      </tr>
    </table>

    <p style="margin:20px 0 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">${closing}</p>
    <p style="margin:16px 0 0 0;font-size:12px;color:#71717a;">
      Pedido ${orderChip(orderShort)}
    </p>
    <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
      ${whatsappHelpLine(contact, `Hola, tengo una duda con mi pedido #${orderShort}`)}
    </p>
  `;

  return shell({
    preheader: `${single ? "Tu gift card" : `${args.cards.length} gift cards`} por ${totalFmt}`,
    title: "Confirmación de tu pedido",
    bodyHtml: body,
    contact,
  });
}

// ============================================================
// Utilities
// ============================================================

function formatPeso(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
