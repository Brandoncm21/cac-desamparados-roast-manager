import { describe, it, expect } from "vitest";
import {
  isProtectedPage,
  isPublicPage,
  PROTECTED_PAGE_PATTERNS,
  PUBLIC_PAGE_PATTERNS,
  MIDDLEWARE_MATCHER,
} from "@/lib/routes";

describe("isProtectedPage", () => {
  it("considera la raíz como protegida", () => {
    expect(isProtectedPage("/")).toBe(true);
  });

  it("considera vacía como protegida", () => {
    expect(isProtectedPage("")).toBe(true);
  });

  it("reconoce todas las páginas protegidas listadas", () => {
    for (const pattern of PROTECTED_PAGE_PATTERNS) {
      expect(isProtectedPage(pattern)).toBe(true);
      expect(isProtectedPage(`${pattern}/123/editar`)).toBe(true);
    }
  });

  it("rechaza rutas que no están en la lista", () => {
    expect(isProtectedPage("/cliente")).toBe(false);
    expect(isProtectedPage("/orden")).toBe(false);
    expect(isProtectedPage("/reportes-no")).toBe(false);
  });
});

describe("isPublicPage", () => {
  it("reconoce todas las páginas públicas listadas", () => {
    for (const pattern of PUBLIC_PAGE_PATTERNS) {
      expect(isPublicPage(pattern)).toBe(true);
    }
  });

  it("rechaza rutas similares pero distintas", () => {
    expect(isPublicPage("/login-fail")).toBe(false);
    expect(isPublicPage("/logins")).toBe(false);
    expect(isPublicPage("/registers")).toBe(false);
  });
});

describe("mutuamente excluyentes para paths típicos", () => {
  it("/login es público, no protegido", () => {
    expect(isPublicPage("/login")).toBe(true);
    expect(isProtectedPage("/login")).toBe(false);
  });

  it("/admin es protegido, no público", () => {
    expect(isProtectedPage("/admin")).toBe(true);
    expect(isPublicPage("/admin")).toBe(false);
  });

  it("/api/* no es ni público ni protegido (lo cubre cada endpoint)", () => {
    expect(isProtectedPage("/api/ordenes")).toBe(false);
    expect(isPublicPage("/api/ordenes")).toBe(false);
  });
});

describe("MIDDLEWARE_MATCHER", () => {
  it("incluye raíz y páginas protegidas", () => {
    expect(MIDDLEWARE_MATCHER).toContain("/");
    expect(MIDDLEWARE_MATCHER).toContain("/login");
    expect(MIDDLEWARE_MATCHER).toContain("/admin/:path*");
  });

  it("NO incluye /api/*", () => {
    expect(MIDDLEWARE_MATCHER.some((p) => p.startsWith("/api"))).toBe(false);
  });
});
