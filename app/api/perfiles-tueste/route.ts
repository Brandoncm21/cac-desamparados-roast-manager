import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearPerfilSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError, requireRole, statusDeCodigoPg, withErrorHandler } from "@/lib/api-helpers";

async function post(request: NextRequest) {
  await requireRole(["Admin", "Tostador"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearPerfilSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase.rpc("crear_perfil_tueste", {
    p_datos: parsed.data,
  });

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));

  const payload = data as { perfil?: { id_perfil?: number } } & Record<string, unknown>;
  return apiOk({ ...payload, id_perfil: payload.perfil?.id_perfil }, 201);
}

export const POST = withErrorHandler(post);
