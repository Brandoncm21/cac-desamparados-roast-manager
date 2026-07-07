import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function get() {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zonas_finca")
    .select("id_zona, nombre")
    .order("nombre");

  if (error) return apiError(error.message, 500);
  return apiOk(data ?? []);
}

async function post(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const body = await request.json();

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return apiError("El nombre de la zona es obligatorio", 400);

  const { data, error } = await supabase
    .from("zonas_finca")
    .insert({ nombre })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
