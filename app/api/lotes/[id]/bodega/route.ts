import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarBodegaBodySchema } from "@/lib/schemas/etapas";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

export async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);

  const { data: bodegas, error } = await supabase
    .from("bodega_lote")
    .select(`
      *,
      secado_bodega(id_secado, cantidad_sacos, created_at)
    `)
    .eq("id_lote", loteId)
    .is("deleted_at", null)
    .order("finicio_reposo", { ascending: false, nullsFirst: false });

  if (error) return apiError(error.message, 500);
  return apiOk(bodegas ?? []);
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

  const parsed = guardarBodegaBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { bodega, secados_guardados } = parsed.data;
  const datos = Object.fromEntries(
    Object.entries(bodega).filter(([, v]) => v !== "" && v !== undefined)
  );

  const { data, error } = await supabase.rpc("guardar_bodega", {
    p_id_lote: loteId,
    p_bodega: datos,
    p_secados_guardados: Array.isArray(secados_guardados) ? secados_guardados : null,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
