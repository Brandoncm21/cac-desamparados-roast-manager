import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarCatacionBodySchema } from "@/lib/schemas/catacion";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { parsePaginacion, sanitizarBusqueda, apiPaginado } from "@/lib/pagination";

export async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());
  let query = supabase
    .from("catacion_tueste")
    .select(
      "*, perfiles_tueste!catacion_tueste_perfil_tueste_ref_fkey(id_orden, numero_lote, nombre_cafe, estado)",
      { count: "exact" }
    )
    .is("deleted_at", null);

  const term = sanitizarBusqueda(searchParams.get("search"));
  if (term) {
    query = query.ilike("nlote", `%${term}%`);
  }

  const { page, pageSize } = paginacion.data;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, paginacion.data.page, paginacion.data.pageSize);
}

export const GET = withErrorHandler(get);

export async function post(request: NextRequest) {
  await requireRole(["Tostador", "Admin"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = guardarCatacionBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { catacion, rondas } = parsed.data;
  const payload = {
    ...catacion,
    ffreposo: catacion.ffreposo ?? new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc("guardar_catacion", {
    p_catacion: payload as unknown as Record<string, unknown>,
    p_rondas: rondas,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const POST = withErrorHandler(post);
