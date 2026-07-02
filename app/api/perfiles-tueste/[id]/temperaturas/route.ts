import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkTemperaturasSchema } from "@/lib/schemas/perfiles";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("trazabilidad_temperatura")
    .select("*")
    .eq("id_perfil", Number(id))
    .order("minuto");

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const parsed = bulkTemperaturasSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const rows = parsed.data.temperaturas.map((t) => ({
    id_perfil: Number(id),
    minuto: t.minuto,
    temperatura_registrada: t.temperatura_registrada,
  }));

  const { data, error } = await supabase
    .from("trazabilidad_temperatura")
    .upsert(rows, { onConflict: "id_perfil, minuto" })
    .select();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}
