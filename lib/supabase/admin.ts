import { createClient } from "@supabase/supabase-js";
import { envServer } from "@/lib/env-server";
import { requireRole } from "@/lib/api-helpers";
import type { UserRole } from "@/lib/auth-helpers";

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

export async function createAdminClientWithRoleCheck(roles: UserRole[]) {
  const { user, role } = await requireRole(roles);
  const supabase = createAdminClient();
  return { user, role, supabase };
}
