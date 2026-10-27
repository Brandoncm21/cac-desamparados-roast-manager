import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmarTuesteSchema } from "@/lib/schemas/orden-pasos";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string; pasoId: string }>;
}

async function post(request: NextRequest, { params }: Params) {
  const { id: idOrden, pasoId } = await params;
  const idOrdenNum = Number(idOrden);
  const pasoIdNum = Number(pasoId);

  if (!Number.isInteger(idOrdenNum) || idOrdenNum <= 0 || !Number.isInteger(pasoIdNum) || pasoIdNum <= 0) {
    return apiValidationError({
      formErrors: ["Identificadores inválidos"],
      fieldErrors: {},
    });
  }

  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();

  const body = await request.json();
  const parsed = confirmarTuesteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Pre-validaciones (mensajes y status precisos antes de la transacción)
  const { data: paso, error: pasoError } = await supabase
    .from("orden_pasos")
    .select("id_paso, estado")
    .eq("id_paso", pasoIdNum)
    .eq("id_orden", idOrdenNum)
    .single();

  if (pasoError || !paso) return apiError("Paso no encontrado", 404);
  if (paso.estado !== "EN_PROCESO") {
    return apiError("El paso debe estar en proceso para confirmarse", 400);
  }

  // Transacción completa en DB: paso + cierre de orden si no quedan pendientes.
  const { data, error } = await supabase.rpc("confirmar_tueste_paso", {
    p_id_paso: pasoIdNum,
    p_peso_final_kg: parsed.data.peso_final_kg,
    p_observaciones: parsed.data.observaciones || null,
  });

  if (error) {
    const mensaje = error.message || "Error al confirmar el tueste";
    const status = /no encontrado/i.test(mensaje)
      ? 404
      : /permisos|Solo Admin/i.test(mensaje)
        ? 403
        : 400;
    return apiError(mensaje, status);
  }

  return apiOk(data);
}

export const POST = withErrorHandler(post);
