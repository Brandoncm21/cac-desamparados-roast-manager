import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarOrdenSchema } from "@/lib/schemas/ordenes";
import { apiOk, apiError, apiValidationError, requireAuth, requireRole, withErrorHandler } from "@/lib/api-helpers";

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const supabase = await createClient();
  const { id } = await params;

  const { data: orden, error } = await supabase
    .from("ordenes_trabajo")
    .select("*, clientes(*), servicios_ejecutados(*), especificaciones_orden(*)")
    .eq("id_orden", Number(id))
    .is("deleted_at", null)
    .single();

  if (error) return apiError("Orden no encontrada", 404);

  const { data: perfiles } = await supabase
    .from("perfiles_tueste")
    .select("id_perfil, numero_lote, fecha_tueste")
    .eq("id_orden", Number(id))
    .is("deleted_at", null);

  return apiOk({ ...orden, perfiles_tueste: perfiles || [] });
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Recepción', 'Tostador']);
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const parsed = actualizarOrdenSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[PUT /api/ordenes/:id] Validation error:", parsed.error.issues);
    return apiValidationError(parsed.error.flatten());
  }

  const { data, error, status, statusText } = await supabase
    .from("ordenes_trabajo")
    .update(parsed.data)
    .eq("id_orden", Number(id))
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    console.error("[PUT /api/ordenes/:id] Supabase error:", {
      id: Number(id),
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      status,
      statusText,
    });

    const statusCode = error.code === "PGRST116" ? 404 : 500;
    return apiError(error.message, statusCode);
  }

  if (!data) {
    return apiError("Orden no encontrada o no tiene permisos", 404);
  }

  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['Admin', 'Recepción', 'Tostador']);
  const supabase = await createClient();
  const { id } = await params;

  const { data, error, status, statusText } = await supabase
    .from("ordenes_trabajo")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id_orden", Number(id))
    .is("deleted_at", null)
    .select();

  if (error) {
    console.error("[DELETE /api/ordenes/:id] Supabase error:", {
      id: Number(id),
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      status,
      statusText,
    });

    const statusCode = error.code === "PGRST116" ? 404 : 500;
    return apiError(error.message, statusCode);
  }

  if (!data || data.length === 0) {
    console.warn("[DELETE /api/ordenes/:id] No rows affected:", {
      id: Number(id),
      message: "Orden no encontrada, ya eliminada o sin permisos",
    });
    return apiError("Orden no encontrada, ya eliminada o sin permisos", 404);
  }

  console.log("[DELETE /api/ordenes/:id] Soft delete success:", {
    id: Number(id),
    rowsAffected: data.length,
  });

  return apiOk({ deleted: true });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
