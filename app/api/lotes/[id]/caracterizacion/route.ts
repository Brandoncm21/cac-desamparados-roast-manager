import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarCaracterizacionBodySchema } from "@/lib/schemas/etapas";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

export async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);

  const { data: car, error } = await supabase
    .from("caracterizacion_lote")
    .select("*")
    .eq("id_lote", loteId)
    .is("deleted_at", null)
    .order("tiempo", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!car) return apiOk({ caracterizacion: null, rcs: [] });

  const { data: rcs } = await supabase
    .from("caracterizacion_rc")
    .select("*")
    .eq("caracterizacion_id", car.id_caracterizacion)
    .is("deleted_at", null)
    .order("tipo_rc");

  return apiOk({ caracterizacion: car, rcs: rcs ?? [] });
}

export const GET = withErrorHandler(get);

export async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);
  const body = await request.json();

  const parsed = guardarCaracterizacionBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { caracterizacion, rcs } = parsed.data;
  const payloadRcs = Array.isArray(rcs) ? rcs : null;
  // El JSON que manda al RPC no puede llevar claves con valor "": el RPC interpreta
  // claves absent = mantener → limpiamos lids vacíos ANTES de serializar.
  const datos: Record<string, unknown> = Object.fromEntries(
    Object.entries(caracterizacion).filter(([, v]) => v !== "" && v !== undefined)
  );

  const { data, error } = await supabase.rpc("guardar_caracterizacion", {
    p_id_lote: loteId,
    p_datos: datos,
    p_rcs: payloadRcs,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
