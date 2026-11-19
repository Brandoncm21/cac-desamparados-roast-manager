import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, requireRole, statusDeCodigoPg, withErrorHandler } from "@/lib/api-helpers";
import {
  COLORES_CAFE_VERDE,
  GRADOS_CALIFICACION,
  OLORES_CAFE_VERDE,
} from "@/lib/schemas/beneficio";

async function get() {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cat_defecto_calificacion")
    .select("id_defecto, codigo, nombre, tipo_cafe, categoria, proporcion, orden")
    .eq("activo", true)
    .order("tipo_cafe")
    .order("orden");

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));

  return apiOk({
    defectos: data ?? [],
    colores: COLORES_CAFE_VERDE,
    olores: OLORES_CAFE_VERDE,
    grados: GRADOS_CALIFICACION,
  });
}

export const GET = withErrorHandler(get);
