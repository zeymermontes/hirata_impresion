import "server-only";
import { Resend } from "resend";
import { serverOnlyEnv } from "@/lib/env";
import type { GiftCard } from "@/lib/gift-cards";

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
  // Surface the exact from/to/subject hitting Resend so we can debug
  // domain-verification / sandbox issues without guessing.
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
// Gift card delivery email
// ============================================================

export async function sendGiftCardEmail(card: GiftCard): Promise<void> {
  if (!card.recipient_email) return;
  const subject = `${card.sender_name ? `${card.sender_name} te envió` : "Tienes"} una gift card de Hirata`;
  const html = renderGiftCardEmail(card);
  await sendEmail({ to: card.recipient_email, subject, html });
}

// ============================================================
// Buyer confirmation — sent to the customer who *bought* the gift cards
// once they've gone out (either by email or queued for physical shipping).
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
  const count = args.cards.length;
  const subject =
    count === 1
      ? "¡Tu gift card está en camino!"
      : `¡Tus ${count} gift cards están en camino!`;
  const html = renderBuyerConfirmationEmail(args);
  await sendEmail({ to: args.buyerEmail, subject, html });
}

function renderBuyerConfirmationEmail(args: {
  buyerName: string | null;
  orderId: string;
  cards: BuyerGiftCardIssued[];
}): string {
  const greeting = args.buyerName
    ? `¡Hola ${escapeHtml(args.buyerName)}!`
    : "¡Hola!";
  const total = args.cards.reduce((s, c) => s + Number(c.amount), 0);
  const totalFmt = formatPeso(total);
  const orderShort = args.orderId.slice(0, 8);

  const rows = args.cards
    .map((c) => {
      const who = c.recipient_name
        ? escapeHtml(c.recipient_name)
        : c.recipient_email
          ? escapeHtml(c.recipient_email)
          : "destinatario";
      const where = c.recipient_email
        ? `<span style="color:#71717a;">(${escapeHtml(c.recipient_email)})</span>`
        : "";
      const channel =
        c.delivery_method === "physical"
          ? "Tarjeta física"
          : "Por correo electrónico";
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
          <p style="margin:0;font-size:14px;color:#0a0a0a;">
            Para <strong>${who}</strong> ${where}
          </p>
          <p style="margin:2px 0 0 0;font-size:12px;color:#71717a;">${channel}</p>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;text-align:right;font-weight:600;color:#0a0a0a;">
          ${formatPeso(Number(c.amount))}
        </td>
      </tr>`;
    })
    .join("");

  // Tailor the closing copy: when there's a physical card, the admin still
  // needs to ship it — say so so the buyer doesn't think it's already
  // arrived.
  const hasPhysical = args.cards.some((c) => c.delivery_method === "physical");
  const closing = hasPhysical
    ? "Las tarjetas digitales ya salieron al correo del destinatario. La(s) tarjeta(s) física(s) se preparan y envían en los próximos días."
    : "Las gift cards ya salieron al correo del destinatario.";

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:#0a0a0a;padding:20px 24px;color:#ffffff;">
        <p style="margin:0;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#facc15;">Hirata Impresión Digital</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        <p style="margin:0 0 6px 0;font-size:14px;color:#525252;">${greeting}</p>
        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;line-height:1.3;">
          ${
            args.cards.length === 1
              ? "Tu gift card ya está en camino"
              : "Tus gift cards ya están en camino"
          }
        </h1>
        <p style="margin:0 0 20px 0;font-size:14px;color:#3f3f46;">
          Gracias por tu compra. Aquí están los detalles de lo que enviamos:
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:16px;">
          ${rows}
          <tr>
            <td style="padding:12px 0 0 0;font-size:13px;color:#525252;">Total</td>
            <td style="padding:12px 0 0 0;font-size:16px;font-weight:700;text-align:right;color:#0a0a0a;">${totalFmt}</td>
          </tr>
        </table>

        <p style="margin:8px 0 0 0;font-size:13px;color:#3f3f46;">${closing}</p>
        <p style="margin:16px 0 0 0;font-size:12px;color:#71717a;">
          Pedido <span style="font-family:monospace;">#${orderShort}</span>.
          Si tienes cualquier duda, respóndenos a este correo y con gusto te
          ayudamos.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;color:#71717a;font-size:11px;">
        Hirata Impresión Digital · hola@hirata.mx
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatPeso(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);
}

function renderGiftCardEmail(card: GiftCard): string {
  const amountFmt = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(card.initial_amount);
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
    ? `<p style="margin:0 0 16px 0;color:#525252;">De parte de <strong>${escapeHtml(card.sender_name)}</strong>.</p>`
    : "";
  const message = card.message
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #facc15;background:#fffbeb;color:#3f3f46;font-style:italic;">${escapeHtml(card.message)}</blockquote>`
    : "";
  const expiresLine = expires
    ? `<p style="margin:8px 0 0 0;font-size:12px;color:#71717a;">Vigencia: hasta el ${expires}.</p>`
    : "";

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:#0a0a0a;padding:20px 24px;color:#ffffff;">
        <p style="margin:0;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#facc15;">Hirata Impresión Digital</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#525252;">${greeting}</p>
        <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;line-height:1.2;">Tienes una gift card</h1>
        ${sender}
        ${message}

        <div style="margin:24px 0;padding:20px;border-radius:12px;background:#facc15;color:#0a0a0a;text-align:center;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Saldo disponible</p>
          <p style="margin:6px 0 16px 0;font-size:36px;font-weight:800;line-height:1;">${amountFmt}</p>
          <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Código</p>
          <p style="margin:4px 0 0 0;font-family:monospace;font-size:20px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(card.code)}</p>
        </div>

        <p style="margin:16px 0 0 0;font-size:14px;color:#3f3f46;">
          Usa este código en el checkout de
          <a href="https://hirata.mx/productos" style="color:#facc15;text-decoration:underline;font-weight:600;">hirata.mx</a>
          para aplicar el saldo a tu compra. Puedes usarlo en varios pedidos hasta agotarlo.
        </p>
        ${expiresLine}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;color:#71717a;font-size:11px;">
        Si no esperabas este correo, ignóralo. La gift card solo puede usarla quien tenga el código.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
