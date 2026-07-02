import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearClienteSchema } from "@/lib/schemas/clientes";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  let query = supabase.from("clientes").select("*").order("nombre_completo");

  if (search) {
    query = query.or(
      `nombre_completo.ilike.%${search}%,telefono.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export async function POST(request: NextRequest) {
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
