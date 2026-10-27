import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { crearEmpaqueSchema } from "@/lib/schemas/servicios-maestro";
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
    .from("empaques")
    .select(
      `id_empaque, nombre, capacidad_kg, activo, created_at, updated_at,
      empaque_precios(precio, valid_from, valid_to)`,
      { count: "exact" }
    )
    .order("nombre")
    .range(from, to);

  if (busqueda) query = query.ilike("nombre", `%${busqueda}%`);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

async function post(request: NextRequest) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const body = await request.json();

  const parsed = crearEmpaqueSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("empaques")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return apiError(error.message, error.code === "23505" ? 409 : 500);
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
