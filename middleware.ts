import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envServer } from "@/lib/env-server";
import { applySecureCookies } from "@/lib/cookies";
import { isProtectedPage, isPublicPage } from "@/lib/routes";

/**
 * Matcher explícito: sólo rutas de páginas. NO incluye:
 *   - `/api/*`       (los Route Handlers validan internamente con
 *                    requireAuth/requireRole, ver lib/api-helpers).
 *   - `/_next/*`     (assets internos de Next.js).
 *   - assets estáticos (svg, png, jpg, ...) servidos por Next.
 *
 * Reducir el matcher elimina una llamada `getUser()` a Supabase
 * Auth por cada request a `/api/*` y a los recursos estáticos.
 *
 * El array `matcher` debe ser un literal estático para que Next.js
 * pueda compilarlo. Si necesitas añadir una ruta nueva, edita
 * también `lib/routes.ts` (la única fuente de verdad para los
 * helpers `isProtectedPage`/`isPublicPage`).
 */
export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/admin/:path*",
    "/clientes/:path*",
    "/ordenes/:path*",
    "/tueste/:path*",
    "/reportes/:path*",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    envServer.SUPABASE_URL,
    envServer.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          response = NextResponse.next({ request });
          applySecureCookies(request, response, cookiesToSet, headers);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  if (
    !isAuthenticated &&
    isProtectedPage(pathname) &&
    !isPublicPage(pathname)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
