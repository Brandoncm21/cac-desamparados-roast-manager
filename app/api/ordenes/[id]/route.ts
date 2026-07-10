import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { actualizarOrdenSchema } from "@/lib/schemas/ordenes";
import { apiOk, apiError, apiValidationError, requireAuth, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;
  const ordenId = validateIdParam(id);

  const { data: orden, error } = await supabase
    .from("ordenes_trabajo")
    .select("*, clientes(*), servicios_ejecutados(*), especificaciones_orden(*)")
    .eq("id_orden", ordenId)
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Orden no encontrada", 404);

  const { data: perfiles } = await supabase
    .from("perfiles_tueste")
    .select("id_perfil, numero_lote, fecha_tueste")
    .eq("id_orden", ordenId)
    .is("deleted_at", null);

  return apiOk({ ...orden, perfiles_tueste: perfiles || [] });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Recepción', 'Tostador']);
  const supabase = await createClient();
  const { id } = await params;
  const ordenId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarOrdenSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update(parsed.data)
    .eq("id_orden", ordenId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) return apiError("Orden no encontrada o no tiene permisos", 404);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ordenId = validateIdParam(id);

  const { supabase } = await createAdminClientWithRoleCheck(['Admin', 'Recepción', 'Tostador']);
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_orden", ordenId)
    .is("deleted_at", null)
    .select();

  if (error) return apiError(error.message, error.code === "PGRST116" ? 404 : 500);
  if (!data || data.length === 0) return apiError("Orden no encontrada, ya eliminada o sin permisos", 404);

  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
