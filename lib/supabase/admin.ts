import { createClient } from "@supabase/supabase-js";
import { envServer } from "@/lib/env-server";

export function createAdminClient() {
  return createClient(
    envServer.SUPABASE_URL,
    envServer.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
