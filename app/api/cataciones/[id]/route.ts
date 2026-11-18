import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { catacionSchema } from "@/lib/schemas/catacion";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const catacionId = validateIdParam(id);

  const { data, error } = await supabase
    .from("catacion_tueste")
    .select(
      "*, lotes_cafe!catacion_tueste_id_lote_fkey(id_lote, nlote, enproceso, clientes(nombre_completo), fincas(nombre, altura))"
    )
    .eq("id_catacion_tueste", catacionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Catación no encontrada", 404);

  return apiOk(data);
}

export const GET = withErrorHandler(get);

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Tostador", "Admin"]);
  const supabase = await createClient();
  const { id } = await params;
  const catacionId = validateIdParam(id);
  const body = await request.json();

  const parsed = catacionSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase.rpc("guardar_catacion", {
    p_catacion: {
      ...parsed.data,
      id_catacion_tueste: catacionId,
    } as unknown as Record<string, unknown>,
  });

  if (error) return apiError(error.message, 400);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
