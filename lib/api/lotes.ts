/**
 * Acceso a `/api/lotes`.
 *
 * El endpoint es paginado (`apiPaginado`), así que `leerJson` devuelve el
 * arreglo de la página y no el sobre completo.
 */

import { leerJson } from "./http";

export interface LoteResumen {
  id_lote: number;
  nlote: string;
  clientes: { nombre_completo: string } | null;
  fincas: { nombre: string } | null;
}

const PAGE_SIZE_DEFAULT = 100;

export async function listarLotes(
  opts: { page?: number; pageSize?: number } = {}
): Promise<LoteResumen[]> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    pageSize: String(opts.pageSize ?? PAGE_SIZE_DEFAULT),
  });

  const res = await fetch(`/api/lotes?${params}`);
  return leerJson<LoteResumen[]>(res);
}
