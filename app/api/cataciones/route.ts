import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { catacionSchema } from "@/lib/schemas/catacion";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { parsePaginacion, sanitizarBusqueda, apiPaginado } from "@/lib/pagination";

const FILTROS = ["todos", "si", "no"] as const;

/**
 * Lista de **lotes** con su estado de catación.
 *
 * `estado=si|no` filtra por la marca `catado`; `todos` no filtra.
 */
async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const estado = searchParams.get("estado") ?? "todos";
  if (!FILTROS.includes(estado as (typeof FILTROS)[number])) {
    return apiError("estado inválido: use todos, si o no", 422);
  }

  let query = supabase.from("v_lotes_catacion").select("*", { count: "exact" });

  if (estado === "si") query = query.eq("catado", true);
  if (estado === "no") query = query.eq("catado", false);

  const term = sanitizarBusqueda(searchParams.get("search"));
  if (term) query = query.ilike("nlote", `%${term}%`);

  const { page, pageSize } = paginacion.data;
  const { data, error, count } = await query
    .order("nlote", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

export const GET = withErrorHandler(get);

async function post(request: NextRequest) {
  await requireRole(["Tostador", "Admin"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = catacionSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // La RPC hace upsert por lote y valida que el lote exista.
  const { data, error } = await supabase.rpc("guardar_catacion", {
    p_catacion: parsed.data as unknown as Record<string, unknown>,
  });

  if (error) return apiError(error.message, 400);
  return apiOk(data, 201);
}

export const POST = withErrorHandler(post);
