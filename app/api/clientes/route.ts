import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearClienteSchema } from "@/lib/schemas/clientes";
import { apiOk, apiError, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function get(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  let query = supabase
    .from("clientes")
    .select("*")
    .is("deleted_at", null)
    .order("nombre_completo");

  if (search) {
    query = query.or(
      `nombre_completo.ilike.%${search}%,telefono.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

async function post(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearClienteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("clientes")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
