import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverOnlyEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverOnlyEnv();
  return createClient<Database>(env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
