import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarRecibidoSchema } from "@/lib/schemas/beneficio";
import {
  apiOk,
  apiError,
  apiValidationError,
  requireRole,
  statusDeCodigoPg,
  validateIdParam,
  withErrorHandler,
} from "@/lib/api-helpers";

const SELECT_CON_JOINS =
  "*, productores(nombre_completo), fincas(id_finca, nombre, altura, productor_id, zonas_finca(nombre))";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const idLote = validateIdParam(id);

  const [lote, caracterizacion, secado, bodegaje, trilla, catacion, calificacion] =
    await Promise.all([
      supabase
        .from("lotes_cafe")
        .select(SELECT_CON_JOINS)
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("caracterizacion_lote")
        .select("*")
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("secado_lote")
        .select("*")
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("bodega_lote")
        .select("*")
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("trilla_lote")
        .select("*")
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("catacion_tueste")
        .select("*")
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("calificacion_lote")
        .select("*")
        .eq("id_lote", idLote)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

  if (lote.error) {
    return apiError(lote.error.message, statusDeCodigoPg(lote.error.code));
  }
  if (!lote.data) return apiError("Lote no encontrado", 404);

  return apiOk({
    ...lote.data,
    etapas: {
      caracterizacion: caracterizacion.data ?? null,
      secado: secado.data ?? null,
      bodegaje: bodegaje.data ?? null,
      trilla: trilla.data ?? null,
      catacion: catacion.data ?? null,
      calificacion: calificacion.data ?? null,
    },
  });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const idLote = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarRecibidoSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { fecha_recibido, ...resto } = parsed.data;
  const payload = {
    ...resto,
    ...(fecha_recibido ? { fecha_recibido } : {}),
  };

  const { data, error } = await supabase
    .from("lotes_cafe")
    .update(payload)
    .eq("id_lote", idLote)
    .is("deleted_at", null)
    .select(SELECT_CON_JOINS)
    .maybeSingle();

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  if (!data) return apiError("Lote no encontrado", 404);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const idLote = validateIdParam(id);

  const { data, error } = await supabase
    .from("lotes_cafe")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_lote", idLote)
    .is("deleted_at", null)
    .select("id_lote")
    .maybeSingle();

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  if (!data) return apiError("Lote no encontrado", 404);
  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
