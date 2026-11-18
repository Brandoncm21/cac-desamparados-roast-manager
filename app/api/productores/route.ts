import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

/**
 * Catálogo de productores (F0/F1): entidad independiente de `clientes`,
 * usada por el módulo Recibido de Café para seleccionar productor → finca.
 */
async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const { page, pageSize } = paginacion.data;
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;
  const busqueda = sanitizarBusqueda(searchParams.get("search"));

  let query = supabase
    .from("productores")
    .select("id_productor, nombre_completo, telefono", { count: "exact" })
    .is("deleted_at", null)
    .order("nombre_completo")
    .range(from, to);

  if (busqueda) query = query.ilike("nombre_completo", `%${busqueda}%`);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

export const GET = withErrorHandler(get);
