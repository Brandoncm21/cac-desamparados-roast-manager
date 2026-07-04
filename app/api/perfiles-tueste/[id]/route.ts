import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearPerfilSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: perfil, error } = await supabase
    .from("perfiles_tueste")
    .select("*, empleados!perfiles_tueste_id_tostador_fkey(nombre), ordenes_trabajo(numero_factura)")
    .eq("id_perfil", Number(id))
    .single();

  if (error) return apiError("Perfil no encontrado", 404);

  const { data: temperaturas } = await supabase
    .from("trazabilidad_temperatura")
    .select("*")
    .eq("id_perfil", Number(id))
    .order("minuto");

  const { data: hitos } = await supabase
    .from("hitos_termicos")
    .select("*")
    .eq("id_perfil", Number(id));

  const { data: metricas } = await supabase
    .from("metricas_tueste")
    .select("*")
    .eq("id_perfil", Number(id));

  const { data: ajustes } = await supabase
    .from("ajustes_tueste")
    .select("*")
    .eq("id_perfil", Number(id))
    .order("orden_secuencia");

  return apiOk({
    ...perfil,
    temperaturas: temperaturas || [],
    hitos: hitos || [],
    metricas: metricas || [],
    ajustes: ajustes || [],
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const parsed = crearPerfilSchema.partial().safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("perfiles_tueste")
    .update(parsed.data)
    .eq("id_perfil", Number(id))
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}
