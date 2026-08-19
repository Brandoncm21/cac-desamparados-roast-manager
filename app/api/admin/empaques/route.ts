import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { crearEmpaqueSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, withErrorHandler } from "@/lib/api-helpers";

async function get(_request: NextRequest) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { data, error } = await supabase
    .from("empaques")
    .select(`
      *,
      empaque_precios(precio, valid_from, valid_to)
    `)
    .order("nombre");

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

async function post(request: NextRequest) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const body = await request.json();

  const parsed = crearEmpaqueSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("empaques")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return apiError(error.message, error.code === "23505" ? 409 : 500);
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
