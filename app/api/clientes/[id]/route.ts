import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarClienteSchema } from "@/lib/schemas/clientes";
import { apiOk, apiError, apiValidationError, requireAuth, requireRole, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id_cliente", Number(id))
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Cliente no encontrado", 404);

  const { data: ordenes } = await supabase
    .from("ordenes_trabajo")
    .select("id_orden, numero_factura, fecha_orden, estado_orden")
    .eq("id_cliente", Number(id))
    .is("deleted_at", null)
    .order("fecha_orden", { ascending: false });

  return apiOk({ ...cliente, historial_ordenes: ordenes || [] });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin']);
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

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Recepción']);
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from("clientes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_cliente", Number(id))
    .is("deleted_at", null);

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
