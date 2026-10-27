import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  apiPaginado,
  construirPaginacion,
  paginaParamsSchema,
  parsePaginacion,
  sanitizarBusqueda,
} from "../pagination";

describe("paginaParamsSchema", () => {
  it("aplica defaults page=1 y pageSize=25", () => {
    const params = new URLSearchParams();
    const parsed = parsePaginacion(params);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBe(DEFAULT_PAGE_SIZE);
    }
  });

  it("acepta page y pageSize válidos", () => {
    const parsed = parsePaginacion(new URLSearchParams("page=3&pageSize=10"));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(3);
      expect(parsed.data.pageSize).toBe(10);
    }
  });

  it("rechaza page negativos, cero o no numéricos", () => {
    for (const page of ["0", "-2", "abc", "1.5"]) {
      const parsed = parsePaginacion(new URLSearchParams(`page=${page}`));
      expect(parsed.success).toBe(false);
    }
  });

  it("rechaza pageSize fuera de rango 1..MAX_PAGE_SIZE", () => {
    expect(parsePaginacion(new URLSearchParams("pageSize=0")).success).toBe(false);
    expect(
      parsePaginacion(new URLSearchParams(`pageSize=${MAX_PAGE_SIZE + 1}`)).success
    ).toBe(false);
    expect(
      parsePaginacion(new URLSearchParams(`pageSize=${MAX_PAGE_SIZE}`)).success
    ).toBe(true);
  });

  it("exporta el schema crudo con defaults", () => {
    const parsed = paginaParamsSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ page: 1, pageSize: 25 });
    }
  });
});

describe("construirPaginacion", () => {
  it("calcula totalPages con techo y mínimo 1", () => {
    expect(construirPaginacion(95, 1, 10)).toEqual({
      page: 1,
      pageSize: 10,
      total: 95,
      totalPages: 10,
    });
    expect(construirPaginacion(0, 1, 10).totalPages).toBe(1);
    expect(construirPaginacion(25, 1, 25).totalPages).toBe(1);
  });
});

describe("apiPaginado", () => {
  it("responde { data, pagination }", async () => {
    const res = apiPaginado([{ id: 1 }], 1, 1, 25);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      data: [{ id: 1 }],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
  });
});

describe("sanitizarBusqueda", () => {
  it("elimina comas, comodines y paréntesis que rompen PostgREST", () => {
    expect(sanitizarBusqueda("juan, perez%")).toBe("juan perez");
    expect(sanitizarBusqueda("(admin);")).toBe("admin");
  });

  it("recorta espacios, limita longitud y maneja vacíos", () => {
    expect(sanitizarBusqueda("  café  ")).toBe("café");
    expect(sanitizarBusqueda(null)).toBe("");
    expect(sanitizarBusqueda("")).toBe("");
    expect(sanitizarBusqueda("a".repeat(200))).toHaveLength(100);
  });
});
