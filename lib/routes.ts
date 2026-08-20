/**
 * Reglas de enrutamiento para el middleware de Next.js.
 *
 * Concentrar la lógica de matching aquí permite cubrir con tests
 * sin necesidad de mockear NextRequest/NextResponse.
 */

/**
 * Páginas que requieren sesión activa. El middleware redirige a
 * `/login` cuando un usuario sin sesión intenta acceder a ellas.
 *
 * La raíz (`/`) también se considera protegida (la página inicial
 * del dashboard).
 */
export const PROTECTED_PAGE_PATTERNS = [
  "/admin",
  "/clientes",
  "/ordenes",
  "/tueste",
  "/reportes",
] as const;

/**
 * Páginas públicas (no requieren sesión, pero redirigen a `/`
 * cuando un usuario autenticado intenta acceder a ellas).
 */
export const PUBLIC_PAGE_PATTERNS = [
  "/login",
  "/register",
  "/forgot-password",
] as const;

/**
 * Matcher explícito del middleware. NO incluye `/api/*` ni assets.
 *
 * Este array se importa también desde el middleware para mantener
 * sincronizado el `config.matcher`.
 */
export const MIDDLEWARE_MATCHER: string[] = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/admin/:path*",
  "/clientes/:path*",
  "/ordenes/:path*",
  "/tueste/:path*",
  "/reportes/:path*",
];

/**
 * Determina si una ruta de página requiere sesión activa.
 */
export function isProtectedPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  return PROTECTED_PAGE_PATTERNS.some(
    (pattern) =>
      pathname === pattern || pathname.startsWith(`${pattern}/`)
  );
}

/**
 * Determina si una ruta de página es pública (no requiere sesión).
 */
export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_PATTERNS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
