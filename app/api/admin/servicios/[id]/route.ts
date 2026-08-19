import { NextRequest } from "next/server";
import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
import { actualizarServicioSchema, intervalosServicioSchema } from "@/lib/schemas/servicios-maestro";
import { apiOk, apiError, apiValidationError, validateIdParam, withErrorHandler } from "@/lib/api-helpers";
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
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
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
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
  const { id } = await params;
  const servicioId = validateIdParam(id);
  const body = await request.json();

  const parsed = actualizarServicioCompletoSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { intervalos, ...datosServicio } = parsed.data;

  // Normalizar descripcion vacía a null para consistencia en BD
  if (datosServicio.descripcion === "") datosServicio.descripcion = null;

  // Verificar que el servicio existe
  const { data: existente } = await supabase
    .from("servicios_maestro")
    .select("id_servicio_maestro")
    .eq("id_servicio_maestro", servicioId)
    .maybeSingle();

  if (!existente) return apiError("Servicio no encontrado", 404);

  // 1. Actualizar datos del servicio
  if (Object.keys(datosServicio).length > 0) {
    const { error: updError } = await supabase
      .from("servicios_maestro")
      .update(datosServicio)
      .eq("id_servicio_maestro", servicioId);

    if (updError) {
      console.error("PUT /api/admin/servicios - update maestro:", updError);
      return apiError(updError.message, 500);
    }
  }

  // 2. Sincronizar intervalos si vienen en el payload
  if (intervalos) {
    // Validar solapes antes de tocar BD
    const overlapCheck = intervalosServicioSchema.safeParse(
      intervalos.map((i) => ({
        peso_min_kg: i.peso_min_kg,
        peso_max_kg: i.peso_max_kg,
        precio_por_kg: i.precio_por_kg,
      }))
    );
    if (!overlapCheck.success) return apiValidationError(overlapCheck.error);

    // Desactivar todos los intervalos activos primero para evitar solapes
    // transitorios (el trigger solo valida contra intervalos activos).
    const { error: deactError } = await supabase
      .from("servicio_precios")
      .update({ activo: false })
      .eq("id_servicio", servicioId)
      .eq("activo", true);

    if (deactError) {
      console.error("PUT /api/admin/servicios - deactivar intervalos:", deactError);
      return apiError(deactError.message, 500);
    }

    // Upsert secuencial: reactivar/insertar los intervalos del payload en orden.
    // El conjunto final ya está validado como no-solapado, así que reactivarlos
    // uno a uno nunca genera un solape intermedio.
    for (const i of intervalos) {
      const payload = {
        min_weight_kg: i.peso_min_kg,
        max_weight_kg: i.peso_max_kg ?? null,
        precio_por_kg: i.precio_por_kg,
        activo: true,
      };

      if (i.id_precio) {
        const { error } = await supabase
          .from("servicio_precios")
          .update(payload)
          .eq("id_precio", i.id_precio)
          .eq("id_servicio", servicioId);
        if (error) {
          console.error("PUT /api/admin/servicios - update intervalo:", error);
          return apiError(error.message, 500);
        }
      } else {
        const { error } = await supabase
          .from("servicio_precios")
          .insert({ id_servicio: servicioId, ...payload });
        if (error) {
          console.error("PUT /api/admin/servicios - insert intervalo:", error);
          return apiError(error.message, 500);
        }
      }
    }
  }

  // Retornar estado completo actualizado
  const { data: resultado, error: resError } = await supabase
    .from("servicios_maestro")
    .select(`
      *,
      servicio_precios(id_precio, precio_por_kg, min_weight_kg, max_weight_kg, activo, created_at)
    `)
    .eq("id_servicio_maestro", servicioId)
    .eq("servicio_precios.activo", true)
    .order("min_weight_kg", { foreignTable: "servicio_precios", ascending: true })
    .single();

  if (resError) return apiError("Servicio no encontrado", 404);
  return apiOk(resultado);
}

async function del(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase } = await createAdminClientWithRoleCheck(["Admin"]);
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
