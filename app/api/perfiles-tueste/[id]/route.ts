import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarPerfilSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const perfilId = validateIdParam(id);

  const { data: perfilData, error } = await supabase
    .from("perfiles_tueste")
    .select(
      "*, empleados!perfiles_tueste_id_tostador_fkey(nombre), ordenes_trabajo(numero_factura), perfil_tueste_lotes(lotes_cafe(id_lote, numero_lote, enproceso, estado_lote, productores(nombre_completo), fincas(nombre)))"
    )
    .eq("id_perfil", perfilId)
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Perfil no encontrado", 404);

  const { perfil_tueste_lotes, ...perfil } = perfilData as Record<string, unknown> & {
    perfil_tueste_lotes?: Array<{ lotes_cafe: Record<string, unknown> | null }>;
  };
  const lotes = (perfil_tueste_lotes ?? [])
    .map((fila) => fila.lotes_cafe)
    .filter((lote): lote is Record<string, unknown> => Boolean(lote));

  const { data: temperaturas } = await supabase
    .from("trazabilidad_temperatura")
    .select("*")
    .eq("id_perfil", perfilId)
    .order("minuto");

  const { data: hitos } = await supabase
    .from("hitos_termicos")
    .select("*")
    .eq("id_perfil", perfilId);

  const { data: metricas } = await supabase
    .from("metricas_tueste")
    .select("*")
    .eq("id_perfil", perfilId);

  const { data: ajustes } = await supabase
    .from("ajustes_tueste")
    .select("*")
    .eq("id_perfil", perfilId)
    .order("orden_secuencia");

  return apiOk({
    ...perfil,
    lotes,
    temperaturas: temperaturas || [],
    hitos: hitos || [],
    metricas: metricas || [],
    ajustes: ajustes || [],
  });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Tostador']);
  const supabase = await createClient();
  const { id } = await params;
  const perfilId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarPerfilSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("perfiles_tueste")
    .update(parsed.data)
    .eq("id_perfil", perfilId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Tostador']);
  const supabase = await createClient();
  const { id } = await params;
  const perfilId = validateIdParam(id);

  const { error } = await supabase
    .from("perfiles_tueste")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_perfil", perfilId)
    .is("deleted_at", null);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
