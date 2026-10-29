import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearServicioSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

async function get(request: NextRequest) {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const { page, pageSize } = paginacion.data;
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;
  const busqueda = sanitizarBusqueda(searchParams.get("search"));

  let query = supabase
    .from("servicios_maestro")
    .select(
      `id_servicio_maestro, nombre, descripcion, tipo, prioridad, activo, created_at, updated_at,
      servicio_precios(id_precio, precio_por_kg, min_weight_kg, max_weight_kg, activo, created_at)`,
      { count: "exact" }
    )
    .order("prioridad")
    .range(from, to);

  if (busqueda) query = query.ilike("nombre", `%${busqueda}%`);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

async function post(request: NextRequest) {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearServicioSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { intervalos, ...datosServicio } = parsed.data;

  // Normalizar descripcion vacía a null para consistencia en BD
  if (datosServicio.descripcion === "") datosServicio.descripcion = null;

  // Transacción completa en DB: servicios_maestro + servicio_precios.
  // La constraint EXCLUDE (0025) / trigger rechaza solapes atómicamente.
  const { data, error } = await supabase.rpc("crear_servicio_con_precios", {
    p_servicio: datosServicio as unknown as object,
    p_intervalos: intervalos.map((i) => ({
      min_weight_kg: i.peso_min_kg,
      max_weight_kg: i.peso_max_kg ?? null,
      precio_por_kg: i.precio_por_kg,
    })) as unknown as object,
  });

  if (error) {
    const mensaje = error.message || "Error al crear el servicio";
    const status = /traslapa/i.test(mensaje)
      ? 409
      : /Solo Admin/i.test(mensaje)
        ? 403
        : /23505/.test(mensaje)
          ? 409
          : 500;
    return apiError(mensaje, status);
  }

  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
