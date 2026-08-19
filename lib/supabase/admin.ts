import "server-only";

import { createAdminClient } from "@/lib/supabase/service-role";
import { requireRole } from "@/lib/api-helpers";
import type { UserRole } from "@/lib/auth-helpers";

export { createAdminClient };

export async function createAdminClientWithRoleCheck(roles: UserRole[]) {
  const { user, role } = await requireRole(roles);
  const supabase = createAdminClient();
  return { user, role, supabase };
}
