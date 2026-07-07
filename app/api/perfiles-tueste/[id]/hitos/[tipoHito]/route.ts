import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertHitoSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tipoHito: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id, tipoHito } = await params;
  const body = await request.json();

  const parsed = upsertHitoSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const hitoData = {
    id_perfil: Number(id),
    tipo_hito: tipoHito,
    ...parsed.data,
  };

  const { data, error } = await supabase
    .from("hitos_termicos")
    .upsert(hitoData, { onConflict: "id_perfil, tipo_hito" })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
