import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import type { SerializeOptions } from "cookie";

/**
 * Helpers centralizados para cookies seguras.
 *
 * Toda cookie escrita por el servidor (Supabase SSR, sesión, refresh,
 * tokens) debe pasar por `applySecureCookies` para garantizar flags
 * seguros de forma homogénea:
 *
 *   - `httpOnly: true`  → no accesible desde JavaScript del cliente.
 *   - `secure: true`    → sólo sobre HTTPS en producción.
 *   - `sameSite: "lax"` → mitigación de CSRF para flows de navegación
 *                         top-level.
 *   - `path: "/"`       → disponible en toda la app.
 *
 * El helper también aplica los headers `Cache-Control: private, no-store`
 * y equivalentes que entrega Supabase para evitar que CDNs o proxies
 * cacheen respuestas con tokens de sesión.
 */

export type CookieToSet = {
  name: string;
  value: string;
  options?: SerializeOptions;
};

export type SecureCookieOptions = SerializeOptions;

const DEFAULT_PATH = "/";
const DEFAULT_SAME_SITE: SerializeOptions["sameSite"] = "lax";

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * Devuelve opciones seguras para una cookie del lado servidor.
 * Mezcla los flags seguros con cualquier `extra` provisto por el
 * llamador, pero **fuerza** los flags críticos incluso si el upstream
 * los desactiva por error:
 *
 *   - `httpOnly` siempre se fuerza a `true` para impedir lectura desde
 *     JavaScript del cliente.
 *   - `secure` se activa automáticamente en producción.
 *   - `sameSite` por defecto es `"lax"` (mitigación CSRF).
 *   - `path` por defecto es `"/"`.
 *
 * El parámetro `env` opcional permite a tests inyectar el valor de
 * `NODE_ENV`. En runtime real se omite.
 */
export function secureCookieOptions(
  extra?: Partial<SerializeOptions>,
  env: "production" | "development" | "test" = isProduction()
    ? "production"
    : "development"
): SecureCookieOptions {
  const secure = extra?.secure ?? env === "production";
  const sameSite = extra?.sameSite ?? DEFAULT_SAME_SITE;
  const path = extra?.path ?? DEFAULT_PATH;

  return {
    ...extra,
    httpOnly: true,
    secure,
    sameSite,
    path,
  };
}

/**
 * Fusiona las opciones del upstream (Supabase SSR) con los flags
 * seguros. Nunca degrada un flag seguro ya presente, pero completa
 * los ausentes con los valores por defecto seguros.
 */
function mergeWithSecureDefaults(
  options: Partial<SerializeOptions> | undefined,
  env: "production" | "development" | "test" = isProduction()
    ? "production"
    : "development"
): SecureCookieOptions {
  if (!options) return secureCookieOptions(undefined, env);
  return secureCookieOptions(options, env);
}

/**
 * Aplica cookies seguras al response de Next.js, propaga los valores
 * al request (para que estén disponibles aguas abajo) y reenvía los
 * headers de no-cache que entrega Supabase SSR.
 */
export function applySecureCookies(
  request: NextRequest,
  response: NextResponse,
  cookiesToSet: CookieToSet[],
  extraHeaders?: Record<string, string>
): void {
  const env: "production" | "development" | "test" = isProduction()
    ? "production"
    : "development";

  for (const { name, value, options } of cookiesToSet) {
    // Propaga al request para que el resto del pipeline (route handlers
    // y Server Components) lean el valor actualizado.
    request.cookies.set(name, value);

    const merged = mergeWithSecureDefaults(options, env);
    response.cookies.set(name, value, merged);
  }

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      response.headers.set(key, value);
    }
  }
}
