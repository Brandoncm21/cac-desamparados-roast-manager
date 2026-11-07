import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearLoteSchema, listarLotesFiltrosSchema } from "@/lib/schemas/lotes";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const filtrosParseo = listarLotesFiltrosSchema.safeParse({
    enproceso: searchParams.get("enproceso") ?? "",
    desde: searchParams.get("desde") ?? "",
    hasta: searchParams.get("hasta") ?? "",
  });
  if (!filtrosParseo.success) return apiValidationError(filtrosParseo.error.flatten());
  const filtros = filtrosParseo.data;

  const { page, pageSize } = paginacion.data;
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;
  const busqueda = sanitizarBusqueda(searchParams.get("search"));

  let query = supabase
    .from("lotes_cafe")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("fecha_acopio", { ascending: false })
    .order("id_lote", { ascending: false })
    .range(from, to);

  if (filtros.enproceso) query = query.eq("enproceso", filtros.enproceso);
  if (filtros.desde) query = query.gte("fecha_acopio", `${filtros.desde}T00:00:00.000Z`);
  if (filtros.hasta) query = query.lte("fecha_acopio", `${filtros.hasta}T23:59:59.999Z`);

  if (busqueda) {
    query = query.or(
      `nlote.ilike.%${busqueda}%,nproductor.ilike.%${busqueda}%,nfinca.ilike.%${busqueda}%`
    );
  }

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

async function post(request: NextRequest) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearLoteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { fecha_acopio, ...resto } = parsed.data;
  const payload = { ...resto, ...(fecha_acopio ? { fecha_acopio } : {}) };

  const { data, error } = await supabase
    .from("lotes_cafe")
    .insert(payload)
    .select()
    .single();

  if (error) return apiError(error.message, error.code === "23505" ? 409 : 500);
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
