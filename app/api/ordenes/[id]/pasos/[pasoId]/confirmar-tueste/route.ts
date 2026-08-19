import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmarTuesteSchema } from "@/lib/schemas/orden-pasos";
import { calcularMerma } from "@/lib/services/resolver-tarifa";
import { hayPasosPendientes } from "@/lib/services/orquestador";
import { apiOk, apiError, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string; pasoId: string }>;
}

async function post(request: NextRequest, { params }: Params) {
  const { id: idOrden, pasoId } = await params;
  const idOrdenNum = Number(idOrden);
  const pasoIdNum = Number(pasoId);

  await requireAuth();
  const supabase = await createClient();

  const body = await request.json();
  const parsed = confirmarTuesteSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data: paso, error: pasoError } = await supabase
    .from("orden_pasos")
    .select("*, servicios_maestro(tipo)")
    .eq("id_paso", pasoIdNum)
    .eq("id_orden", idOrdenNum)
    .single();

  if (pasoError || !paso) return apiError("Paso no encontrado", 404);

  const tipoServicio = (paso.servicios_maestro as unknown as { tipo: string })?.tipo;
  if (tipoServicio !== "tueste") {
    return apiError("Este endpoint es solo para el paso de tueste", 400);
  }

  if (paso.estado !== "EN_PROCESO") {
    return apiError("El paso debe estar en proceso para confirmarse", 400);
  }

  if (paso.peso_inicial_kg == null) {
    return apiError("El paso de tueste no tiene peso inicial registrado", 400);
  }

  const { mermaKg } = calcularMerma(paso.peso_inicial_kg, parsed.data.peso_final_kg);

  const { data: authUser } = await supabase.auth.getUser();
  const userId = authUser.user?.id;

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id_empleado")
    .eq("auth_user_id", userId)
    .single();

  const idOperadorCierre = empleado?.id_empleado ?? null;

  const { data: pasoActualizado, error } = await supabase
    .from("orden_pasos")
    .update({
      estado: "COMPLETADO",
      peso_final_kg: parsed.data.peso_final_kg,
      merma_kg: mermaKg,
      id_operador_cierre: idOperadorCierre,
      fecha_fin: new Date().toISOString(),
      observaciones: parsed.data.observaciones || null,
      costo_total_paso: paso.costo_total_paso,
    })
    .eq("id_paso", pasoIdNum)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  if (!(await hayPasosPendientes(supabase, idOrdenNum))) {
    await supabase
      .from("ordenes_trabajo")
      .update({ estado_orden: "Completado", updated_at: new Date().toISOString() })
      .eq("id_orden", idOrdenNum);
  }

  return apiOk(pasoActualizado);
}

export const POST = withErrorHandler(post);
