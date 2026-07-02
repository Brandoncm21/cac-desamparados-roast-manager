import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearPerfilSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
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
