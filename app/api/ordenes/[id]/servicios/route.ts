import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError, requireRole, validateIdParam, withErrorHandler } from "@/lib/api-helpers";

const agregarServicioSchema = z.object({
  tipo_servicio: z
    .enum([
      "Chancado", "Trillado", "Clasificación Mecánica", "Clasificación Manual",
      "Tueste", "Molido", "Empacado",
    ])
    .or(z.string().min(1)),
  servicio_id: z.number().int().positive().optional().nullable(),
  empaque_id: z.number().int().positive().optional().nullable(),
  peso_inicial: z.number().positive().optional().nullable(),
  peso_kg: z.number().positive().optional().nullable(),
  precio: z.number().min(0).optional().nullable(),
  snapshot_precio_por_kg: z.number().min(0).optional().nullable(),
  snapshot_precio_empaque: z.number().min(0).optional().nullable(),
  linea_total: z.number().min(0).optional().nullable(),
  override_precio: z.boolean().optional().default(false),
  override_motivo: z.string().optional().nullable(),
  id_operador: z.number().int().positive().optional().nullable(),
});

async function post(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { id } = await params;
  const ordenId = validateIdParam(id);
  const body = await request.json();

  const parsed = agregarServicioSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("servicios_ejecutados")
    .insert({ id_orden: ordenId, ...parsed.data })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}

export const POST = withErrorHandler(post);
