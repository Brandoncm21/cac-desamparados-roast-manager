import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiError, apiValidationError } from "@/lib/api-helpers";

const agregarServicioSchema = z.object({
  tipo_servicio: z.enum([
    "Chancado", "Trillado", "Clasificación Mecánica", "Clasificación Manual",
    "Tueste", "Molido", "Empacado",
  ]),
  peso_inicial: z.number().positive().optional().nullable(),
  precio: z.number().min(0).optional().nullable(),
  id_operador: z.number().int().positive().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const parsed = agregarServicioSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("servicios_ejecutados")
    .insert({ id_orden: Number(id), ...parsed.data })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data, 201);
}
