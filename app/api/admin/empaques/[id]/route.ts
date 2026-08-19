import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { actualizarEmpaqueSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const empaqueId = validateIdParam(id);

  const { data, error } = await supabase
    .from("empaques")
    .select(`
      *,
      empaque_precios(precio, valid_from, valid_to, creado_por, created_at)
    `)
    .eq("id_empaque", empaqueId)
    .order("valid_from", { foreignTable: "empaque_precios", ascending: false })
    .single();

  if (error) return apiError("Empaque no encontrado", 404);
  return apiOk(data);
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const empaqueId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarEmpaqueSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("empaques")
    .update(parsed.data)
    .eq("id_empaque", empaqueId)
    .select()
    .single();

  if (error || !data) return apiError("Empaque no encontrado", 404);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const empaqueId = validateIdParam(id);

  // Soft delete: desactivar sin eliminar (preserva historial)
  const { data, error } = await supabase
    .from("empaques")
    .update({ activo: false })
    .eq("id_empaque", empaqueId)
    .select();

  if (error) return apiError(error.message, 500);
  if (!data || data.length === 0) return apiError("Empaque no encontrado", 404);

  return apiOk({ deactivated: true, ...data[0] });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
