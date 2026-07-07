import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarOrdenSchema } from "@/lib/schemas/ordenes";
import { apiOk, apiError, apiValidationError, requireAuth, requireRole, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;

  const { data: orden, error } = await supabase
    .from("ordenes_trabajo")
    .select("*, clientes(*), servicios_ejecutados(*), especificaciones_orden(*)")
    .eq("id_orden", Number(id))
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Orden no encontrada", 404);

  const { data: perfiles } = await supabase
    .from("perfiles_tueste")
    .select("id_perfil, numero_lote, fecha_tueste")
    .eq("id_orden", Number(id))
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
  const body = await request.json();

  const parsed = actualizarOrdenSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update(parsed.data)
    .eq("id_orden", Number(id))
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Recepción', 'Tostador']);
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from("ordenes_trabajo")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_orden", Number(id))
    .is("deleted_at", null);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
