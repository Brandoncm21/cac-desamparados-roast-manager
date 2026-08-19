import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { iniciarPasoSchema } from "@/lib/schemas/orden-pasos";
import { resolverTarifaPorPeso, calcularCostoServicio } from "@/lib/services/resolver-tarifa";
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
  const parsed = iniciarPasoSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data: paso, error: pasoError } = await supabase
    .from("orden_pasos")
    .select("id_paso, id_orden, servicio_id, estado, prioridad")
    .eq("id_paso", pasoIdNum)
    .eq("id_orden", idOrdenNum)
    .single();

  if (pasoError || !paso) return apiError("Paso no encontrado", 404);
  if (paso.estado !== "PENDIENTE") return apiError("El paso ya fue iniciado o completado", 400);

  // Solo se puede iniciar el primer paso no completado de la secuencia
  // (orden determinista: prioridad ASC, id ASC).
  const { data: pasosOrden } = await supabase
    .from("orden_pasos")
    .select("id_paso, prioridad, estado")
    .eq("id_orden", idOrdenNum)
    .order("prioridad", { ascending: true })
    .order("id_paso", { ascending: true });

  const primerPendiente = (pasosOrden || []).find(
    (p) => p.estado !== "COMPLETADO" && p.estado !== "OMITIDO"
  );

  if (!primerPendiente || primerPendiente.id_paso !== pasoIdNum) {
    return apiError("Existen pasos anteriores sin completar", 400);
  }

  const { data: tarifas } = await supabase
    .from("servicio_precios")
    .select("id_precio, id_servicio, min_weight_kg, max_weight_kg, precio_por_kg")
    .eq("id_servicio", paso.servicio_id)
    .eq("activo", true);

  const tarifa = resolverTarifaPorPeso(tarifas || [], parsed.data.peso_inicial_kg);
  if (!tarifa) {
    const rangos = (tarifas || [])
      .map((t) => (t.max_weight_kg == null ? `≥ ${t.min_weight_kg} kg` : `${t.min_weight_kg}–${t.max_weight_kg} kg`))
      .join(", ");
    return apiError(
      rangos
        ? `No existe tarifa para ${parsed.data.peso_inicial_kg} kg. Rangos disponibles: ${rangos}. Contacte al administrador si necesita un intervalo nuevo.`
        : `El servicio no tiene tarifas activas. Contacte al administrador para configurar intervalos de precio.`,
      400
    );
  }

  const subtotalServicio = calcularCostoServicio(
    parsed.data.peso_inicial_kg,
    tarifa.precio_por_kg
  );

  const { data: authUser } = await supabase.auth.getUser();
  const userId = authUser.user?.id;

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id_empleado")
    .eq("auth_user_id", userId)
    .single();

  const idOperadorInicio = empleado?.id_empleado ?? null;

  const { data, error } = await supabase
    .from("orden_pasos")
    .update({
      estado: "EN_PROCESO",
      peso_inicial_kg: parsed.data.peso_inicial_kg,
      peso_facturable_kg: parsed.data.peso_inicial_kg,
      tarifa_id: tarifa.id_precio,
      snapshot_precio_kg: tarifa.precio_por_kg,
      subtotal_servicio: subtotalServicio,
      id_operador_inicio: idOperadorInicio,
      fecha_inicio: new Date().toISOString(),
      costo_total_paso: subtotalServicio,
    })
    .eq("id_paso", pasoIdNum)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const POST = withErrorHandler(post);
