import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearPerfilSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function post(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearPerfilSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("perfiles_tueste")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}

export const POST = withErrorHandler(post);
