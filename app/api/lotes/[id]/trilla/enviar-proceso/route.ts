import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarProcesoBodySchema } from "@/lib/schemas/catacion";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

// e1 (FR-013): trilla completada → orden CafeTrack + puente K1
export async function post(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Recepción", "Admin"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);
  const body = await request.json().catch(() => ({}));

  const parsed = enviarProcesoBodySchema.safeParse({ ["id_trilla"]: (body as Record<string, unknown>)?.["id_trilla"] });
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Confirma la trilla pertenece a este lote
  const { data: trilla, error: errTrilla } = await supabase
    .from("trilla_lote")
    .select("id_trilla")
    .eq("id_trilla", parsed.data.id_trilla)
    .eq("id_lote", loteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (errTrilla) return apiError(errTrilla.message, 500);
  if (!trilla) return apiError("Trilla no encontrada para este lote", 404);

  const { data, error } = await supabase.rpc("crear_orden_desde_trilla", {
    p_id_trilla: parsed.data.id_trilla,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const POST = withErrorHandler(post);
