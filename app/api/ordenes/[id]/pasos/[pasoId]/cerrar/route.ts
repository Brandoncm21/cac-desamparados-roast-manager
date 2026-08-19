import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cerrarGeneralSchema, cerrarEmpacadoSchema } from "@/lib/schemas/orden-pasos";
import { calcularMerma } from "@/lib/services/resolver-tarifa";
import { calcularEmpaques } from "@/lib/services/empacado";
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

  const { data: paso, error: pasoError } = await supabase
    .from("orden_pasos")
    .select("*")
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

  // ---- EMPACADO: requiere empaque + peso base ya capturado al iniciar ----
  if (tipoServicio === "empacado") {
    const parsed = cerrarEmpacadoSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error.flatten());

    const pesoBaseKg = Number(paso.peso_facturable_kg ?? paso.peso_inicial_kg);
    if (!pesoBaseKg || pesoBaseKg <= 0) {
      return apiError("El paso no tiene un peso base definido para empacar", 400);
    }

    const { data: empaque } = await supabase
      .from("empaques")
      .select("capacidad_kg, empaque_precios(precio, valid_from, valid_to)")
      .eq("id_empaque", parsed.data.empaque_id)
      .single();

    if (!empaque) return apiError("Empaque no encontrado", 400);

    const precioEmpaque = (empaque.empaque_precios as unknown as { precio: number; valid_to: string | null }[] || [])
      .filter((p) => !p.valid_to)
      .sort((a, b) => new Date((b as any).valid_from || 0).getTime() - new Date((a as any).valid_from || 0).getTime())[0]?.precio ?? null;

    if (precioEmpaque == null) return apiError("El empaque no tiene precio vigente", 400);
    if (empaque.capacidad_kg == null || Number(empaque.capacidad_kg) <= 0) {
      return apiError("El empaque no tiene capacidad definida en kg. Edítelo en el módulo de empaques.", 400);
    }

    let res;
    try {
      res = calcularEmpaques({
        pesoDisponible: pesoBaseKg,
        capacidadKg: Number(empaque.capacidad_kg),
        precioUnitario: Number(precioEmpaque),
      });
    } catch {
      return apiError("La capacidad del empaque es inválida", 400);
    }

    const subtotalServicio = Number(paso.subtotal_servicio) || 0;
    const costoTotal = subtotalServicio + res.costoEmpaques;

    const { data: authUser } = await supabase.auth.getUser();
    const userId = authUser.user?.id;
    const { data: empleado } = await supabase
      .from("empleados")
      .select("id_empleado")
      .eq("auth_user_id", userId)
      .single();

    const { data: pasoActualizado, error } = await supabase
      .from("orden_pasos")
      .update({
        estado: "COMPLETADO",
        empaque_id: parsed.data.empaque_id,
        cantidad_empaques: res.cantidad,
        snapshot_precio_empaque: Number(precioEmpaque),
        costo_empaques: res.costoEmpaques,
        costo_total_paso: costoTotal,
        id_operador_cierre: empleado?.id_empleado ?? null,
        fecha_fin: new Date().toISOString(),
        observaciones: parsed.data.observaciones || null,
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

  // ---- GENERAL (chancado, trillado, molido, clasificación): ----
  // El cobro se definió al iniciar con peso_inicial. peso_final es opcional.
  const parsed = cerrarGeneralSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const subtotalServicio = Number(paso.subtotal_servicio) || 0;

  let mermaKg: number | null = null;
  if (parsed.data.peso_final_kg != null && paso.peso_inicial_kg != null) {
    mermaKg = calcularMerma(paso.peso_inicial_kg, parsed.data.peso_final_kg).mermaKg;
  }

  const { data: authUser } = await supabase.auth.getUser();
  const userId = authUser.user?.id;
  const { data: empleado } = await supabase
    .from("empleados")
    .select("id_empleado")
    .eq("auth_user_id", userId)
    .single();

  const { data: pasoActualizado, error } = await supabase
    .from("orden_pasos")
    .update({
      estado: "COMPLETADO",
      peso_final_kg: parsed.data.peso_final_kg ?? null,
      merma_kg: mermaKg,
      subtotal_servicio: subtotalServicio,
      costo_total_paso: subtotalServicio,
      id_operador_cierre: empleado?.id_empleado ?? null,
      fecha_fin: new Date().toISOString(),
      observaciones: parsed.data.observaciones || null,
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
