import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError } from "@/lib/api-helpers";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zonas_finca")
    .select("id_zona, nombre")
    .order("nombre");

  if (error) return apiError(error.message, 500);
  return apiOk(data ?? []);
}

export async function POST(request: NextRequest) {
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
