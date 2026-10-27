import { z } from "zod";
import { NextResponse } from "next/server";

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

export const paginaParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginaParams = z.infer<typeof paginaParamsSchema>;

export function parsePaginacion(searchParams: URLSearchParams) {
  return paginaParamsSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
}

export interface PaginacionMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function construirPaginacion(
  total: number,
  page: number,
  pageSize: number
): PaginacionMeta {
  const size = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  return {
    page,
    pageSize: size,
    total,
    totalPages: Math.max(Math.ceil(total / size), 1),
  };
}

export function apiPaginado<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  status = 200
): NextResponse {
  return NextResponse.json(
    { data, pagination: construirPaginacion(total, page, pageSize) },
    { status }
  );
}

/**
 * Sanitiza términos de búsqueda para filtros PostgREST `.or(...)`:
 * elimina comas (separador de condiciones), comodines y paréntesis que
 * romperían la sintaxis o ampliarían el match. Devuelve "" si queda vacío.
 */
export function sanitizarBusqueda(valor: string | null, maxLength = 100): string {
  if (!valor) return "";
  return valor
    .replace(/[%(),;]/g, "")
    .trim()
    .slice(0, maxLength);
}
