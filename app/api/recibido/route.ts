import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  crearRecibidoSchema,
  listarRecibidoFiltrosSchema,
} from "@/lib/schemas/beneficio";
import {
  apiOk,
  apiError,
  apiValidationError,
  requireRole,
  statusDeCodigoPg,
  withErrorHandler,
} from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

const SELECT_CON_JOINS =
  "*, productores(nombre_completo), fincas(id_finca, nombre, altura, productor_id, zonas_finca(nombre))";

/**
 * Recibido de Café: punto de origen del lote.
 * GET lista los recibidos; POST crea el lote (nace aquí).
 */
async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const numerico = (clave: string) => {
    const raw = searchParams.get(clave);
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : Number.NaN;
  };

  const filtrosParseo = listarRecibidoFiltrosSchema.safeParse({
    enproceso: searchParams.get("enproceso") ?? "",
    estado_lote: searchParams.get("estado_lote") ?? "",
    productor_id: numerico("productor_id"),
    finca_id: numerico("finca_id"),
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
    .select(SELECT_CON_JOINS, { count: "exact" })
    .is("deleted_at", null)
    .order("fecha_recibido", { ascending: false })
    .order("id_lote", { ascending: false })
    .range(from, to);

  if (filtros.enproceso) query = query.eq("enproceso", filtros.enproceso);
  if (filtros.estado_lote) query = query.eq("estado_lote", filtros.estado_lote);
  if (filtros.productor_id) query = query.eq("productor_id", filtros.productor_id);
  if (filtros.finca_id) query = query.eq("finca_id", filtros.finca_id);
  if (filtros.desde) query = query.gte("fecha_recibido", `${filtros.desde}T00:00:00.000Z`);
  if (filtros.hasta) query = query.lte("fecha_recibido", `${filtros.hasta}T23:59:59.999Z`);
  if (busqueda) {
    query = query.or(`numero_lote.ilike.%${busqueda}%,numero_recibo.ilike.%${busqueda}%`);
  }

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

async function post(request: NextRequest) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearRecibidoSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { fecha_recibido, ...resto } = parsed.data;

  // La finca debe pertenecer al productor y tener zona/altura completas.
  const { data: finca, error: errorFinca } = await supabase
    .from("fincas")
    .select("id_finca, productor_id, altura, zonas_finca(nombre)")
    .eq("id_finca", resto.finca_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (errorFinca) return apiError(errorFinca.message, 500);
  if (!finca) return apiError("La finca indicada no existe o fue eliminada", 400);
  if (finca.productor_id !== resto.productor_id) {
    return apiError("La finca no pertenece al productor seleccionado", 400);
  }
  const zonaRelacion: unknown = finca.zonas_finca;
  const zona = Array.isArray(zonaRelacion) ? (zonaRelacion[0] as { nombre?: string } | undefined)?.nombre : (zonaRelacion as { nombre?: string } | null)?.nombre;
  if (!zona || finca.altura == null) {
    return apiError("La finca seleccionada no tiene zona y/o altura registrada", 422);
  }

  const payload = {
    ...resto,
    zona_finca: zona,
    altura_finca: finca.altura,
    ...(fecha_recibido ? { fecha_recibido } : {}),
  };

  const { data, error } = await supabase
    .from("lotes_cafe")
    .insert(payload)
    .select(SELECT_CON_JOINS)
    .single();

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
