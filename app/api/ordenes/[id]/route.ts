import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: orden, error } = await supabase
    .from("ordenes_trabajo")
    .select("*, clientes(*), servicios_ejecutados(*), especificaciones_orden(*)")
    .eq("id_orden", Number(id))
    .single();

  if (error) return apiError("Orden no encontrada", 404);

  const { data: perfiles } = await supabase
    .from("perfiles_tueste")
    .select("id_perfil, numero_lote, fecha_tueste")
    .eq("id_orden", Number(id));

  return apiOk({ ...orden, perfiles_tueste: perfiles || [] });
}
