import { createBrowserClient } from "@supabase/ssr";
import { envClient } from "@/lib/env-client";

export function createClient() {
  return createBrowserClient(
    envClient.SUPABASE_URL,
    envClient.SUPABASE_ANON_KEY
  );
}
