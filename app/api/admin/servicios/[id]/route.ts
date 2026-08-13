import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { actualizarServicioMaestroSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const servicioId = validateIdParam(id);

  const { data, error } = await supabase
    .from("servicios_maestro")
    .select(`
      *,
      servicio_precios(precio_por_kg, valid_from, valid_to, creado_por, created_at)
    `)
    .eq("id_servicio_maestro", servicioId)
    .order("valid_from", { foreignTable: "servicio_precios", ascending: false })
    .single();

  if (error) return apiError("Servicio no encontrado", 404);
  return apiOk(data);
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const servicioId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarServicioMaestroSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("servicios_maestro")
    .update(parsed.data)
    .eq("id_servicio_maestro", servicioId)
    .select()
    .single();

  if (error || !data) return apiError("Servicio no encontrado", 404);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const servicioId = validateIdParam(id);

  // Soft delete: desactivar sin eliminar (preserva historial)
  const { data, error } = await supabase
    .from("servicios_maestro")
    .update({ activo: false })
    .eq("id_servicio_maestro", servicioId)
    .select();

  if (error) return apiError(error.message, 500);
  if (!data || data.length === 0) return apiError("Servicio no encontrado", 404);

  return apiOk({ deactivated: true, ...data[0] });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
