import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

async function get(_request: NextRequest, { params }: Params) {
  const { id: idOrden } = await params;
  const idOrdenNum = Number(idOrden);

  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orden_pasos")
    .select("*, servicios_maestro(id_servicio_maestro, tipo, nombre)")
    .eq("id_orden", idOrdenNum)
    .order("prioridad", { ascending: true });

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const GET = withErrorHandler(get);
