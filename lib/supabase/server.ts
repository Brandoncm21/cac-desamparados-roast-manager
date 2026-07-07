import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envServer } from "@/lib/env-server";

export async function createClient() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log("[createClient] Cookies found:", allCookies.length);

    return createServerClient(
      envServer.SUPABASE_URL,
      envServer.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return allCookies;
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing sessions.
            }
          },
        },
      }
    );
  } catch (error) {
    console.error("[createClient] Error creating Supabase client:", error);
    throw error;
  }
}
