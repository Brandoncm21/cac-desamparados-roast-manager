import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string; pasoId: string }>;
}

// Cierre de paso (general o empacado). La rama la resuelve la RPC según el
// tipo del servicio; body flexible validado por rango de cada campo.
const cerrarPasoBodySchema = z.object({
  peso_final_kg: z.number().positive().optional().nullable(),
  empaque_id: z.number().int().positive().optional().nullable(),
  observaciones: z.string().max(1000).optional().nullable().or(z.literal("")),
});

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

  // Pre-validaciones (mensajes y status precisos antes de la transacción)
  const { data: paso, error: pasoError } = await supabase
    .from("orden_pasos")
    .select("id_paso, servicio_id, estado")
    .eq("id_paso", pasoIdNum)
    .eq("id_orden", idOrdenNum)
    .single();

  if (pasoError || !paso) return apiError("Paso no encontrado", 404);
  if (paso.estado !== "EN_PROCESO") {
    return apiError("El paso debe estar en proceso para cerrarse", 400);
  }

  const { data: maestro } = await supabase
    .from("servicios_maestro")
    .select("tipo")
    .eq("id_servicio_maestro", paso.servicio_id)
    .single();

  const tipoServicio = maestro?.tipo ?? "general";
  if (tipoServicio === "tueste") {
    return apiError("El paso de tueste se confirma con su propia acción", 400);
  }

  const body = await request.json();
  const parsed = cerrarPasoBodySchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Transacción completa en DB: paso + cierre de orden si no quedan pendientes.
  const { data, error } = await supabase.rpc("cerrar_paso_orden", {
    p_id_paso: pasoIdNum,
    p_peso_final_kg: parsed.data.peso_final_kg ?? null,
    p_empaque_id: parsed.data.empaque_id ?? null,
    p_observaciones: parsed.data.observaciones || null,
  });

  if (error) {
    const mensaje = error.message || "Error al cerrar el paso";
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
