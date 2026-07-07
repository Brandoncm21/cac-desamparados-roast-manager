import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;

  const { data: perfil, error } = await supabase
    .from("perfiles_tueste")
    .select("tiempo_desarrollo_min, dtr_porcentaje, fecha_optima_consumo, fecha_vencimiento")
    .eq("id_perfil", Number(id))
    .single();

  if (error) return apiError("Perfil no encontrado", 404);

  const { data: metricas } = await supabase
    .from("metricas_tueste")
    .select("tipo_metrica, valor_antes, valor_despues, porcentaje_diferencia")
    .eq("id_perfil", Number(id));

  return apiOk({
    ...perfil,
    metricas: metricas || [],
  });
}

export const GET = withErrorHandler(get);
