import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actualizarServicioSchema, intervalosServicioSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";
import { z } from "zod";

// PUT permite actualizar datos del servicio y/o la lista completa de intervalos
const actualizarServicioCompletoSchema = actualizarServicioSchema.extend({
  intervalos: z
    .array(
      z.object({
        id_precio: z.number().int().positive().optional(),
        peso_min_kg: z.number().min(0),
        peso_max_kg: z.number().positive().optional().nullable(),
        precio_por_kg: z.number().min(0),
      })
    )
    .optional(),
});

async function get(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const { id } = await params;
  const servicioId = validateIdParam(id);

  const { data, error } = await supabase
    .from("servicios_maestro")
    .select(`
      *,
      servicio_precios(id_precio, precio_por_kg, min_weight_kg, max_weight_kg, activo, created_at)
    `)
    .eq("id_servicio_maestro", servicioId)
    .eq("servicio_precios.activo", true)
    .order("min_weight_kg", { foreignTable: "servicio_precios", ascending: true })
    .single();

  if (error) return apiError("Servicio no encontrado", 404);
  return apiOk(data);
}

async function put(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const { id } = await params;
  const servicioId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarServicioCompletoSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { intervalos, ...datosServicio } = parsed.data;

  // Normalizar descripcion vacía a null para consistencia en BD
  if (datosServicio.descripcion === "") datosServicio.descripcion = null;

  // Validar solapes antes de tocar BD (primera línea; la DB revalida con
  // la constraint EXCLUDE declarativa de 0025).
  if (intervalos) {
    const overlapCheck = intervalosServicioSchema.safeParse(
      intervalos.map((i) => ({
        peso_min_kg: i.peso_min_kg,
        peso_max_kg: i.peso_max_kg,
        precio_por_kg: i.precio_por_kg,
      }))
    );
    if (!overlapCheck.success) return apiValidationError(overlapCheck.error);
  }

  // Transacción completa en DB: maestro + desactivación y reemplazo atómico
  // de intervalos. Sin estados intermedios visibles y sin rollbacks manuales.
  const { data, error } = await supabase.rpc("actualizar_servicio_con_precios", {
    p_id_servicio: servicioId,
    p_datos: datosServicio as unknown as object,
    p_intervalos: intervalos
      ? (intervalos.map((i) => ({
          id_precio: i.id_precio ?? null,
          min_weight_kg: i.peso_min_kg,
          max_weight_kg: i.peso_max_kg ?? null,
          precio_por_kg: i.precio_por_kg,
        })) as unknown as object)
      : null,
  });

  if (error) {
    const mensaje = error.message || "Error al actualizar el servicio";
    const status = /no encontrado/i.test(mensaje)
      ? 404
      : /traslapa/i.test(mensaje)
        ? 409
        : /Solo Admin/i.test(mensaje)
          ? 403
          : 500;
    return apiError(mensaje, status);
  }

  return apiOk(data);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const { id } = await params;
  const servicioId = validateIdParam(id);

  // Soft delete: desactivar sin eliminar (preserva historial)
  const { data, error } = await supabase
    .from("servicios_maestro")
    .update({ activo: false })
    .eq("id_servicio_maestro", servicioId)
    .select();

  if (error) return apiError(error.message, 500);
  if (!data || data.length === 0) return apiError("Servicio no encontrado", 404);

  return apiOk({ deactivated: true, ...data[0] });
}

export const GET = withErrorHandler(get);
export const PUT = withErrorHandler(put);
export const DELETE = withErrorHandler(del);
