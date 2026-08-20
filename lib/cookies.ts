import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import type { SerializeOptions } from "cookie";

/**
 * Helpers centralizados para cookies seguras.
 *
 * Toda cookie escrita por el servidor pasa por `applySecureCookies`,
 * pero con un matiz importante para Supabase SSR:
 *
 *   - Las cookies de sesión de Supabase (`sb-...-auth-token`) DEBEN
 *     permanecer legibles por JavaScript, porque `createBrowserClient`
 *     las lee vía `document.cookie`. Forzar `httpOnly: true` las hace
 *     invisibles para el cliente y rompe `getCurrentUserRole()` y todas
 *     las queries con RLS (el cliente queda como `anon`).
 *   - Por eso `httpOnly` SE RESPETA tal cual lo envía el upstream
 *     (Supabase). Si el upstream no lo define, se deja sin setear
 *     (legible por JS), que es el comportamiento intencionado de Supabase.
 *   - `secure: true` sólo en producción, `sameSite: "lax"` y `path: "/"`
 *     sí se aplican como defaults seguros (sin sobrescribir el upstream).
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
 *
 * `httpOnly` se preserva tal cual lo envía el upstream. Para las cookies
 * de sesión de Supabase el upstream no define `httpOnly` (quedan legibles
 * por JS, necesario para `createBrowserClient`). Forzarlo a `true` rompería
 * la sesión del cliente.
 *
 * `secure` se activa automáticamente en producción.
 * `sameSite` por defecto es `"lax"` (mitigación CSRF).
 * `path` por defecto es `"/"`.
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

  const result: SecureCookieOptions = {
    ...extra,
    secure,
    sameSite,
    path,
  };

  // Preservar httpOnly del upstream; si no viene definido, no forzarlo
  // (dejar la cookie legible por JS, como espera Supabase SSR).
  if (extra?.["httpOnly"] !== undefined) {
    (result as Record<string, unknown>)["httpOnly"] = extra["httpOnly"];
  } else {
    delete (result as Record<string, unknown>)["httpOnly"];
  }

  return result;
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
