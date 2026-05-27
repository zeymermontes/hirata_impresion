/**
 * Helper for Server Actions: wraps the action body in try/catch so that
 * network failures or unexpected exceptions become a friendly `ActionState`
 * instead of an unhandled exception. Without this, the form on the client
 * sees a 500 response and React surfaces "An unexpected response was received
 * from the server" — which is opaque to the user.
 *
 * IMPORTANT: must re-throw Next.js's internal navigation errors (redirect,
 * notFound) — those are not real exceptions and are how `redirect()` /
 * `notFound()` work under the hood.
 */
export async function runAction<T extends { message?: string }>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    console.error("[server-action] failed:", e);
    const message =
      e instanceof Error && /fetch failed|getaddrinfo|ENOTFOUND|ETIMEDOUT/i.test(
        e.message,
      )
        ? "No se pudo conectar al servidor. Verifica tu conexión e inténtalo de nuevo."
        : e instanceof Error
          ? e.message
          : "Error inesperado. Inténtalo de nuevo.";
    return { message } as T;
  }
}

function isNextNavigationError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest === "NEXT_NOT_FOUND" ||
    digest === "NEXT_HTTP_ERROR_FALLBACK"
  );
}
