import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarFincaSchema } from "@/lib/schemas/fincas";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

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
  return apiOk(finca);
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

  const { data, error } = await supabase
    .from("fincas")
    .update(parsed.data)
    .eq("id_finca", fincaId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
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
