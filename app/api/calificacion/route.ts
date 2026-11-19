import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiValidationError, requireRole, statusDeCodigoPg, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

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
    .from("calificacion_lote")
    .select(
      "*, lotes_cafe(numero_lote, numero_recibo, productores(nombre_completo))",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("fecha", { ascending: false, nullsFirst: false })
    .order("id_calificacion", { ascending: false })
    .range(from, to);

  const grado = searchParams.get("grado");
  if (grado) query = query.eq("grado", grado);
  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`);
  }

  const { data, count, error } = await query;
  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

export const GET = withErrorHandler(get);
