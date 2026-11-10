import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarSecadoBodySchema } from "@/lib/schemas/etapas";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

export async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);

  const { data: secados, error } = await supabase
    .from("secado_lote")
    .select(`
      *,
      secado_humedad(*),
      secado_ambiente(*),
      secado_temperatura(*),
      secado_camas(*)
    `)
    .eq("id_lote", loteId)
    .is("deleted_at", null)
    .order("finicio", { ascending: false });

  if (error) return apiError(error.message, 500);
  return apiOk(secados ?? []);
}

export const GET = withErrorHandler(get);

export async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);
  const body = await request.json();

  const parsed = guardarSecadoBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { secado, humedades, ambientes, temperaturas, camas } = parsed.data;
  const limpiar = <T extends Record<string, unknown>>(obj: T[]): T[] =>
    obj.map((f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== undefined))) as T[];

  const { data, error } = await supabase.rpc("guardar_secado", {
    p_id_lote: loteId,
    p_secado: Object.fromEntries(
      Object.entries(secado).filter(([, v]) => v !== "" && v !== undefined)
    ),
    p_humedades: humedades ? limpiar(humedades) : null,
    p_ambientes: ambientes ? limpiar(ambientes) : null,
    p_temperaturas: temperaturas ? limpiar(temperaturas) : null,
    p_camas: camas ? camas : null,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
