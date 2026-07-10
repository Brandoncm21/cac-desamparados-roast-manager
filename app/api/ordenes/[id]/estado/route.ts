import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cambiarEstadoOrdenSchema } from "@/lib/schemas/ordenes";
import { apiOk, apiError, apiValidationError, requireAuth, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function patch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;
  const ordenId = validateIdParam(id);
  const body = await request.json();

  const parsed = cambiarEstadoOrdenSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .update({ estado_orden: parsed.data.estado_orden })
    .eq("id_orden", ordenId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PATCH = withErrorHandler(patch);
