import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

const editarServicioSchema = z.object({
  peso_inicial: z.number().positive().optional().nullable(),
  precio: z.number().min(0).optional().nullable(),
  id_operador: z.number().int().positive().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ idServicio: string }> }
) {
  const supabase = await createClient();
  const { idServicio } = await params;
  const body = await request.json();

  const parsed = editarServicioSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("servicios_ejecutados")
    .update(parsed.data)
    .eq("id_servicio", Number(idServicio))
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ idServicio: string }> }
) {
  const supabase = await createClient();
  const { idServicio } = await params;

  const { data: servicio } = await supabase
    .from("servicios_ejecutados")
    .select("id_orden")
    .eq("id_servicio", Number(idServicio))
    .single();

  if (!servicio) return apiError("Servicio no encontrado", 404);

  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select("estado_orden")
    .eq("id_orden", servicio.id_orden)
    .single();

  if (orden?.estado_orden !== "Pendiente") {
    return apiError("Solo se puede eliminar servicios en órdenes Pendiente", 400);
  }

  const { error } = await supabase
    .from("servicios_ejecutados")
    .delete()
    .eq("id_servicio", Number(idServicio));

  if (error) return apiError(error.message, 500);
  return apiOk({ deleted: true });
}
