import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const ADMIN_PREFIX = "/admin";
const ACCOUNT_PREFIX = "/mi-cuenta";

export async function proxy(request: NextRequest) {
  // If Supabase is unreachable (DNS failure, timeout, etc.), don't redirect
  // to /login on protected routes — that would turn a transient network blip
  // into a confusing redirect loop and would also corrupt in-flight Server
  // Action POSTs (the client receives the login HTML and React shows
  // "unexpected response"). Let the request through; the layout-level guard
  // and RLS still enforce security once the network recovers.
  let session: Awaited<ReturnType<typeof updateSession>>;
  try {
    session = await updateSession(request);
  } catch (e) {
    console.error("[proxy] auth refresh failed, letting request through:", e);
    return NextResponse.next({ request });
  }

  const { response, user, role } = session;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith(ACCOUNT_PREFIX) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
