import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarCalificacionSchema } from "@/lib/schemas/beneficio";
import {
  apiOk,
  apiError,
  apiValidationError,
  requireRole,
  statusDeCodigoPg,
  validateIdParam,
  withErrorHandler,
} from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const idLote = validateIdParam(id);

  const { data, error } = await supabase
    .from("calificacion_lote")
    .select("*")
    .eq("id_lote", idLote)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  return apiOk(data ?? null);
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const idLote = validateIdParam(id);
  const body = await request.json();

  const parsed = guardarCalificacionSchema.safeParse({ ...body, id_lote: idLote });
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { id_lote, ...calificacion } = parsed.data;

  const { data, error } = await supabase.rpc("guardar_calificacion", {
    p_id_lote: id_lote,
    p_calificacion: calificacion,
  });

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  return apiOk(data);
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
