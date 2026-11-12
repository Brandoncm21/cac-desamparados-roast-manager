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

  // Filtro opcional por finca (number en query string).
  const idFincaRaw = searchParams.get("id_finca");
  let idFinca: number | undefined;
  if (idFincaRaw) {
    const n = Number(idFincaRaw);
    if (!Number.isInteger(n) || n <= 0) return apiError("id_finca inválido", 422);
    idFinca = n;
  }

  const filtrosParseo = listarLotesFiltrosSchema.safeParse({
    enproceso: searchParams.get("enproceso") ?? "",
    id_finca: idFinca,
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
    .select(
      "*, clientes(nombre_completo), fincas(nombre, altura, zonas_finca(nombre))",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("fecha_acopio", { ascending: false })
    .order("id_lote", { ascending: false })
    .range(from, to);

  if (filtros.enproceso) query = query.eq("enproceso", filtros.enproceso);
  if (filtros.id_finca) query = query.eq("id_finca", filtros.id_finca);
  if (filtros.desde) query = query.gte("fecha_acopio", `${filtros.desde}T00:00:00.000Z`);
  if (filtros.hasta) query = query.lte("fecha_acopio", `${filtros.hasta}T23:59:59.999Z`);

  if (busqueda) query = query.ilike("nlote", `%${busqueda}%`);

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

  if (error) {
    const status = error.code === "23505" ? 409 : error.code === "23503" ? 400 : 500;
    return apiError(error.message, status);
  }
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
