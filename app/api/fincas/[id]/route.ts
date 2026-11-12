import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarFincaSchema } from "@/lib/schemas/fincas";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

/** Lotes y órdenes que referencian la finca: bloquean borrado y cambio de productor. */
async function dependencias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fincaId: number
): Promise<{ lotes: number; ordenes: number }> {
  const [{ count: lotes }, { count: ordenes }] = await Promise.all([
    supabase
      .from("lotes_cafe")
      .select("id_lote", { count: "exact", head: true })
      .eq("id_finca", fincaId)
      .is("deleted_at", null),
    supabase
      .from("ordenes_trabajo")
      .select("id_orden", { count: "exact", head: true })
      .eq("id_finca", fincaId)
      .is("deleted_at", null),
  ]);
  return { lotes: lotes ?? 0, ordenes: ordenes ?? 0 };
}

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const fincaId = validateIdParam(id);

  const { data: finca, error } = await supabase
    .from("fincas")
    .select("*, clientes(nombre_completo), zonas_finca(nombre)")
    .eq("id_finca", fincaId)
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Finca no encontrada", 404);

  const [{ data: lotes }, deps] = await Promise.all([
    supabase
      .from("lotes_cafe")
      .select("id_lote, nlote, enproceso, fecha_acopio, disponible")
      .eq("id_finca", fincaId)
      .is("deleted_at", null)
      .order("fecha_acopio", { ascending: false }),
    dependencias(supabase, fincaId),
  ]);

  return apiOk({
    ...finca,
    lotes: lotes ?? [],
    ordenes_count: deps.ordenes,
    /** Con dependencias no se permite borrar ni mover de productor. */
    tiene_dependencias: deps.lotes + deps.ordenes > 0,
  });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const fincaId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarFincaSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Cambiar de productor dejaría lotes con `id_cliente` y finca incoherentes.
  if (parsed.data.cliente_id != null) {
    const { data: actual } = await supabase
      .from("fincas")
      .select("cliente_id")
      .eq("id_finca", fincaId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!actual) return apiError("Finca no encontrada", 404);

    if (actual.cliente_id !== parsed.data.cliente_id) {
      const deps = await dependencias(supabase, fincaId);
      if (deps.lotes + deps.ordenes > 0) {
        return apiError(
          `No se puede cambiar el productor: la finca tiene ${deps.lotes} lote(s) y ${deps.ordenes} orden(es) asociados`,
          409
        );
      }
    }
  }

  const { data, error } = await supabase
    .from("fincas")
    .update(parsed.data)
    .eq("id_finca", fincaId)
    .is("deleted_at", null)
    .select("*, clientes(nombre_completo), zonas_finca(nombre)")
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : error.code === "23503" ? 400 : 500;
    return apiError(error.message, status);
  }
  if (!data) return apiError("Finca no encontrada", 404);
  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const fincaId = validateIdParam(id);

  const deps = await dependencias(supabase, fincaId);
  if (deps.lotes + deps.ordenes > 0) {
    return apiError(
      `No se puede eliminar: la finca tiene ${deps.lotes} lote(s) y ${deps.ordenes} orden(es) asociados`,
      409
    );
  }

  const { error } = await supabase
    .from("fincas")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_finca", fincaId)
    .is("deleted_at", null);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
