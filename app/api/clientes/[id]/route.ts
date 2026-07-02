import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarClienteSchema } from "@/lib/schemas/clientes";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id_cliente", Number(id))
    .single();

  if (error) return apiError("Cliente no encontrado", 404);

  const { data: ordenes } = await supabase
    .from("ordenes_trabajo")
    .select("id_orden, num_talonario_fisico, fecha_orden, estado_orden")
    .eq("id_cliente", Number(id))
    .order("fecha_orden", { ascending: false });

  return apiOk({ ...cliente, historial_ordenes: ordenes || [] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const parsed = actualizarClienteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("clientes")
    .update(parsed.data)
    .eq("id_cliente", Number(id))
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}
