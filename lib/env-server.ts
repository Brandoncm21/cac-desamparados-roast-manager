/**
 * Acceso a variables de entorno en código server-side.
 *
 * ⚠️ SERVER-ONLY: este módulo NO expone SUPABASE_SERVICE_ROLE_KEY.
 * La service role key reside exclusivamente en `lib/supabase/service-role.ts`
 * para garantizar que sólo se importe desde endpoints server-side autorizados.
 *
 * Reglas:
 *   - Importar únicamente desde Route Handlers (`app/api/**`), Server Components
 *     y scripts server-side.
 *   - Nunca importar este módulo desde componentes `"use client"`.
 *   - Para la service role key, importar `@/lib/supabase/service-role`
 *     en endpoints que ya pasaron `requireRole(['Admin'])`.
 */
import "server-only";

export const envServer = {
  get SUPABASE_URL() {
    const value = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    if (!value) {
      throw new Error(
        "� Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_URL"
      );
    }
    return value;
  },
  get SUPABASE_ANON_KEY() {
    const value = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
    if (!value) {
      throw new Error(
        "❌ Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    return value;
  },
  get NODE_ENV() {
    return (process.env.NODE_ENV || "development") as
      | "development"
      | "production"
      | "test";
  },
  get APP_URL() {
    return process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3016";
  },
} as const;
