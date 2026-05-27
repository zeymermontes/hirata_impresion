import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/database.types";

/**
 * Ensure a user is authenticated. Redirects to /login otherwise.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Ensure the user has the given role (or admin). Redirects to / otherwise.
 */
export async function requireRole(role: UserRole) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== role && profile.role !== "admin")) {
    redirect("/");
  }
  return { supabase, user, profile };
}

export const requireAdmin = () => requireRole("admin");
