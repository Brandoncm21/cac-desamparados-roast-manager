import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError, requireAuth, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

const crearAjusteSchema = z.object({
  orden_secuencia: z.number().int().min(0),
  temperatura_ajuste: z.number().optional().nullable(),
  llama: z.string().max(50).optional().nullable(),
  tiempo: z.number().optional().nullable(),
  aire: z.string().max(50).optional().nullable(),
});

async function post(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;
  const perfilId = validateIdParam(id);
  const body = await request.json();

  const parsed = crearAjusteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("ajustes_tueste")
    .insert({ id_perfil: perfilId, ...parsed.data })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}

export const POST = withErrorHandler(post);
