import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkHitosSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function post(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const perfilId = validateIdParam(id);
  const body = await request.json();

  const parsed = bulkHitosSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const rows = parsed.data.hitos.map((h) => ({
    id_perfil: perfilId,
    tipo_hito: h.tipo_hito,
    tiempo_min: h.tiempo_min ?? null,
    temperatura: h.temperatura ?? null,
  }));

  const { data, error } = await supabase
    .from("hitos_termicos")
    .upsert(rows, { onConflict: "id_perfil, tipo_hito" })
    .select();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const POST = withErrorHandler(post);
