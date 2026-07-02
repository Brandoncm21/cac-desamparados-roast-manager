import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

const upsertMetricaSchema = z.object({
  valor_antes: z.number().optional().nullable(),
  valor_despues: z.number().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tipoMetrica: string }> }
) {
  const supabase = await createClient();
  const { id, tipoMetrica } = await params;
  const body = await request.json();

  const parsed = upsertMetricaSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const metricaData = {
    id_perfil: Number(id),
    tipo_metrica: tipoMetrica,
    ...parsed.data,
  };

  const { data, error } = await supabase
    .from("metricas_tueste")
    .upsert(metricaData, { onConflict: "id_perfil, tipo_metrica" })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}
