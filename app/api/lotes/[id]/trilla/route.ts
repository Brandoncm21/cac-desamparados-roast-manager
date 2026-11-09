import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guardarTrillaBodySchema } from "@/lib/schemas/etapas";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

export async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { id } = await params;
  const loteId = validateIdParam(id);

  const { data: trillas, error } = await supabase
    .from("trilla_lote")
    .select(`
      *,
      peso_verde_trilla(winferiores, wfinal, wfinal_inferiores)
    `)
    .eq("id_lote", loteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);
  return apiOk(trillas ?? []);
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

  const parsed = guardarTrillaBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { trilla, peso_verde } = parsed.data;
  const datos = Object.fromEntries(
    Object.entries(trilla).filter(([, v]) => v !== "" && v !== undefined)
  );
  const payload: Record<string, unknown> = { ...datos };
  // Toggle del formulario: objeto → upsert; '' (off) → soft-delete 1:1 (p_trilla.peso_verde=null)
  payload["peso_verde"] =
    peso_verde && typeof peso_verde === "object"
      ? peso_verde
      : peso_verde === ""
        ? null
        : undefined;

  const { data, error } = await supabase.rpc("guardar_trilla", {
    p_id_lote: loteId,
    p_trilla: payload,
  });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const PUT = withErrorHandler(put);
