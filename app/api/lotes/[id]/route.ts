import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarLoteSchema } from "@/lib/schemas/lotes";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);

  const { data: lote, error } = await supabase
    .from("lotes_cafe")
    .select("*")
    .eq("id_lote", loteId)
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Lote no encontrado", 404);

  // K1: órdenes de trabajo enlazadas a este lote (trazabilidad end-to-end)
  const { data: vinculos } = await supabase
    .from("orden_lotes_externos")
    .select("id_orden, peso_kg, origen, created_at")
    .eq("nlote", lote.nlote)
    .order("created_at", { ascending: false });

  return apiOk({ ...lote, ordenes_vinculadas: vinculos ?? [] });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarLoteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { fecha_acopio, ...resto } = parsed.data;
  const payload = { ...resto, ...(fecha_acopio ? { fecha_acopio } : {}) };

  const { data, error } = await supabase
    .from("lotes_cafe")
    .update(payload)
    .eq("id_lote", loteId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Lote no encontrado", 404);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);

  const { error } = await supabase
    .from("lotes_cafe")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_lote", loteId)
    .is("deleted_at", null);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
