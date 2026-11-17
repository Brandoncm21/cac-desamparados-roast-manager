/**
 * Acceso a `/api/cataciones`.
 *
 * La lista es de **lotes** con su estado de catación (vista
 * `v_lotes_catacion`), no de registros de catación: la pregunta que responde
 * la pantalla es "¿este lote se cató?".
 */

import type { CatacionPayload } from "@/lib/schemas/catacion";
import { leerJson, leerJsonPaginado, type PaginacionApi } from "./http";

export type FiltroCatado = "todos" | "si" | "no";

/** Fila de la lista: un lote con la catación asociada (si existe). */
export interface LoteCatacion {
  id_lote: number;
  nlote: string;
  enproceso: string | null;
  fecha_acopio: string | null;
  cliente: string | null;
  finca: string | null;
  id_catacion_tueste: number | null;
  catado: boolean;
  notas_catacion: string | null;
  catacion_actualizada_at: string | null;
}

export interface Catacion {
  id_catacion_tueste: number;
  id_lote: number;
  catado: boolean;
  notas_catacion: string | null;
  created_at: string;
  updated_at: string;
  lotes_cafe?: {
    id_lote: number;
    nlote: string;
    enproceso: string | null;
    clientes: { nombre_completo: string } | null;
    fincas: { nombre: string; altura: number | null } | null;
  } | null;
}

export interface OpcionesListaCatacion {
  page?: number;
  pageSize?: number;
  estado?: FiltroCatado;
  search?: string;
}

export async function listarLotesCatacion(
  opts: OpcionesListaCatacion = {}
): Promise<{ lotes: LoteCatacion[]; pagination: PaginacionApi }> {
  const params = new URLSearchParams({
    page: String(opts.page ?? 1),
    pageSize: String(opts.pageSize ?? 10),
    estado: opts.estado ?? "todos",
  });

  if (opts.search?.trim()) params.set("search", opts.search.trim());

  const res = await fetch(`/api/cataciones?${params}`);
  const { items, pagination } = await leerJsonPaginado<LoteCatacion>(res);
  return { lotes: items, pagination };
}

export async function obtenerCatacion(idCatacion: number): Promise<Catacion> {
  const res = await fetch(`/api/cataciones/${idCatacion}`);
  return leerJson<Catacion>(res);
}

/**
 * Crea o actualiza según venga `id_catacion_tueste`. El servidor hace upsert
 * por lote, así que registrar dos veces el mismo lote no duplica.
 */
export async function guardarCatacion(
  input: CatacionPayload
): Promise<{ catacion: Catacion }> {
  const { id_catacion_tueste, ...cuerpo } = input;

  const res = await fetch(
    id_catacion_tueste ? `/api/cataciones/${id_catacion_tueste}` : "/api/cataciones",
    {
      method: id_catacion_tueste ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }
  );

  return leerJson<{ catacion: Catacion }>(res);
}
