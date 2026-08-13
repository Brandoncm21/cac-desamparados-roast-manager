import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { crearPrecioServicioSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const servicioId = validateIdParam(id);

  const { data, error } = await supabase
    .from("servicio_precios")
    .select("id_precio, precio_por_kg, valid_from, valid_to, creado_por, created_at")
    .eq("id_servicio", servicioId)
    .order("valid_from", { ascending: false });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

async function post(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const servicioId = validateIdParam(id);
  const body = await request.json();

  const parsed = crearPrecioServicioSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Verificar que el servicio existe
  const { data: servicio } = await supabase
    .from("servicios_maestro")
    .select("id_servicio_maestro")
    .eq("id_servicio_maestro", servicioId)
    .maybeSingle();

  if (!servicio) return apiError("Servicio no encontrado", 404);

  const ahora = new Date().toISOString();

  // Cerrar precio vigente anterior
  const { error: closeError } = await supabase
    .from("servicio_precios")
    .update({ valid_to: ahora })
    .eq("id_servicio", servicioId)
    .is("valid_to", null);

  if (closeError) return apiError(closeError.message, 500);

  const { data, error } = await supabase
    .from("servicio_precios")
    .insert({
      id_servicio: servicioId,
      precio_por_kg: parsed.data.precio_por_kg,
      valid_from: ahora,
      creado_por: user.id,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
