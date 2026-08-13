import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { crearPrecioEmpaqueSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const empaqueId = validateIdParam(id);

  const { data, error } = await supabase
    .from("empaque_precios")
    .select("id_precio, precio, valid_from, valid_to, creado_por, created_at")
    .eq("id_empaque", empaqueId)
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
  const empaqueId = validateIdParam(id);
  const body = await request.json();

  const parsed = crearPrecioEmpaqueSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Verificar que el empaque existe
  const { data: empaque } = await supabase
    .from("empaques")
    .select("id_empaque")
    .eq("id_empaque", empaqueId)
    .maybeSingle();

  if (!empaque) return apiError("Empaque no encontrado", 404);

  const ahora = new Date().toISOString();

  // Cerrar precio vigente anterior
  const { error: closeError } = await supabase
    .from("empaque_precios")
    .update({ valid_to: ahora })
    .eq("id_empaque", empaqueId)
    .is("valid_to", null);

  if (closeError) return apiError(closeError.message, 500);

  const { data, error } = await supabase
    .from("empaque_precios")
    .insert({
      id_empaque: empaqueId,
      precio: parsed.data.precio,
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
