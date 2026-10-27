import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { crearServicioSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

async function get(request: NextRequest) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
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
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const body = await request.json();

  const parsed = crearServicioSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { intervalos, ...datosServicio } = parsed.data;

  // Normalizar descripcion vacía a null para consistencia en BD
  if (datosServicio.descripcion === "") datosServicio.descripcion = null;

  // 1. Crear el maestro de servicio
  const { data: servicio, error: servError } = await supabase
    .from("servicios_maestro")
    .insert(datosServicio)
    .select()
    .single();

  if (servError) {
    console.error("POST /api/admin/servicios - insert maestro:", servError);
    return apiError(servError.message, servError.code === "23505" ? 409 : 500);
  }

  // 2. Insertar intervalos (el trigger de BD rechaza solapes)
  const intervalosData = intervalos.map((i) => ({
    id_servicio: servicio.id_servicio_maestro,
    min_weight_kg: i.peso_min_kg,
    max_weight_kg: i.peso_max_kg ?? null,
    precio_por_kg: i.precio_por_kg,
    activo: true,
  }));

  const { error: intError } = await supabase.from("servicio_precios").insert(intervalosData);

  if (intError) {
    // Rollback manual: eliminar servicio recién creado
    await supabase.from("servicios_maestro").delete().eq("id_servicio_maestro", servicio.id_servicio_maestro);
    console.error("POST /api/admin/servicios - insert intervalos:", intError);
    return apiError(intError.message, 500);
  }

  return apiOk(servicio, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
