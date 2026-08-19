import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envServer } from "@/lib/env-server";
import { applySecureCookies } from "@/lib/cookies";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/api/auth"];

export async function middleware(request: NextRequest) {
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

  // Llama getUser() (no getSession) para forzar verificación server-side.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthenticated = !!user;

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Asegurar que las respuestas con cookies de sesión nunca se cachean.
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
