import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Only treat this callback as a fresh signup when the user confirmed
// their email within the last 5 minutes. After that window we assume
// the callback is for a different flow (password recovery, magic link,
// etc.) and skip the welcome mail.
const RECENT_CONFIRMATION_WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  // Reverse proxies (Render, Fly, Railway) can make `url.origin` leak
  // the internal port. Use the configured public origin instead so the
  // customer doesn't land on an unreachable host.
  const publicOrigin = env.SITE_URL.replace(/\/$/, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Welcome email is best-effort — failure here must not block the
      // redirect or the user is stuck on a blank callback URL.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email && user.email_confirmed_at) {
          const confirmedRecently =
            Date.now() - new Date(user.email_confirmed_at).getTime() <
            RECENT_CONFIRMATION_WINDOW_MS;
          const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
          const alreadyWelcomed = Boolean(meta.welcome_sent);
          if (confirmedRecently && !alreadyWelcomed) {
            const { sendWelcomeEmail } = await import("@/lib/email");
            const { createAdminClient } = await import("@/lib/supabase/admin");
            const userMeta = (user.user_metadata ?? {}) as Record<
              string,
              unknown
            >;
            const fullName =
              typeof userMeta.full_name === "string"
                ? userMeta.full_name
                : null;
            await sendWelcomeEmail({ to: user.email, name: fullName });
            const admin = createAdminClient();
            await admin.auth.admin.updateUserById(user.id, {
              app_metadata: { ...meta, welcome_sent: true },
            });
          }
        }
      } catch (e) {
        console.error("[auth/callback] welcome email failed:", e);
      }
      return NextResponse.redirect(new URL(next, publicOrigin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", publicOrigin));
}
