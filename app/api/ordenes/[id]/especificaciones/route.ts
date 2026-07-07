import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

const upsertEspecificacionesSchema = z.object({
  tipo_tueste: z.string().max(100).optional().nullable(),
  tipo_molienda: z.string().max(100).optional().nullable(),
  tipo_empaque: z.string().max(100).optional().nullable(),
  especificacion_extra: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const parsed = upsertEspecificacionesSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data: existing } = await supabase
    .from("especificaciones_orden")
    .select("id_especificacion")
    .eq("id_orden", Number(id))
    .single();

  let result;
  if (existing) {
    result = await supabase
      .from("especificaciones_orden")
      .update(parsed.data)
      .eq("id_orden", Number(id))
      .select()
      .single();
  } else {
    result = await supabase
      .from("especificaciones_orden")
      .insert({ id_orden: Number(id), ...parsed.data })
      .select()
      .single();
  }

  if (result.error) return apiError(result.error.message, 500);
  return apiOk(result.data);
}

export const PUT = withErrorHandler(put);
