import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarCatacionBodySchema } from "@/lib/schemas/catacion";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

export async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const catacionId = validateIdParam(id);

  const { data, error } = await supabase
    .from("catacion_tueste")
    .select(
      "*, perfiles_tueste!catacion_tueste_perfil_tueste_ref_fkey(id_orden, numero_lote, nombre_cafe, estado), lotes_cafe!catacion_tueste_id_lote_fkey(id_lote, nlote, enproceso, clientes(nombre_completo), fincas(nombre, altura)), catacion_rondas(id_catacion_ronda, valor_calidad, deleted_at)"
    )
    .eq("id_catacion_tueste", catacionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Catación no encontrada", 404);

  const { catacion_rondas, ...catacion } = data as Record<string, unknown> & { catacion_rondas: Array<Record<string, unknown>> };
  return apiOk({
    ...catacion,
    rondas: (catacion_rondas ?? [])
      .filter((r) => r["deleted_at"] === null)
      .map(({ ["deleted_at"]: _deleted, ...r }) => r),
  });
}

export const GET = withErrorHandler(get);

export async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Tostador", "Admin"]);
  const supabase = await createClient();
  const { id } = await params;
  const catacionId = validateIdParam(id);
  const body = await request.json();

  const parsed = guardarCatacionBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { catacion, rondas } = parsed.data;
  const payload = {
    ...catacion,
    id_catacion_tueste: catacionId,
    ffreposo: catacion.ffreposo ?? new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc("guardar_catacion", {
    p_catacion: payload as unknown as Record<string, unknown>,
    p_rondas: rondas,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
