/**
 * Servicio seguro de Supabase con service role key.
 *
 * ⚠️ SERVER-ONLY: este módulo accede a SUPABASE_SERVICE_ROLE_KEY, un secreto
 * con privilegios elevados que NUNCA debe llegar al navegador.
 *
 * Reglas:
 *   - Sólo importar desde archivos dentro de `app/api/`, `lib/supabase/admin.ts`,
 *     o scripts server-side (Node).
 *   - Nunca importar este módulo desde componentes `"use client"`,
 *     hooks de cliente o cualquier archivo bajo `components/` que se renderice
 *     en el navegador.
 *   - Nunca exponer la clave en respuestas JSON, props serializadas, logs,
 *     headers HTTP públicos ni variables NEXT_PUBLIC_*.
 *   - Si necesitas un cliente con privilegios elevados, usa
 *     `createAdminClient()` o `createAdminClientWithRoleCheck()`.
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";

export const SUPABASE_SERVICE_ROLE_KEY: string = (() => {
  const value = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!value || value.length === 0) {
    throw new Error(
      "❌ Variable de entorno faltante: SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return value;
})();

export const SUPABASE_URL: string = (() => {
  const value = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!value || value.length === 0) {
    throw new Error(
      "❌ Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_URL"
    );
  }
  return value;
})();

/**
 * Crea un cliente de Supabase con la service role key.
 * Bypasea RLS: usar únicamente en endpoints server-side protegidos
 * por `requireRole(['Admin'])` o equivalente.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
