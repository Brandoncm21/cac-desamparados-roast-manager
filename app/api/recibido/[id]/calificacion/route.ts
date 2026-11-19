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
    .select(
      "*, calificacion_defecto(id_defecto, numero_defectos, proporcion, equivalencia, cat_defecto_calificacion(nombre, tipo_cafe, categoria, orden))"
    )
    .eq("id_lote", idLote)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  if (!data) return apiOk(null);

  const { calificacion_defecto, ...fila } = data as typeof data & {
    calificacion_defecto?: unknown[];
  };
  return apiOk({ ...fila, defectos: calificacion_defecto ?? [] });
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

  const { data, error } = await supabase.rpc("guardar_hoja_calificacion", {
    p_id_lote: id_lote,
    p_datos: calificacion,
  });

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  return apiOk(data);
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
