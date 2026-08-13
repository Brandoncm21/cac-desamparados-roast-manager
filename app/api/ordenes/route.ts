import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearOrdenSchema } from "@/lib/schemas/ordenes";
import { calcularLineaTotal } from "@/lib/calculo-precios";
import { apiOk, apiError, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function get(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const cliente = searchParams.get("cliente");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let query = supabase
    .from("ordenes_trabajo")
    .select("*, clientes(nombre_completo, telefono)")
    .is("deleted_at", null)
    .order("fecha_orden", { ascending: false });

  if (estado) query = query.eq("estado_orden", estado);
  if (cliente) query = query.eq("id_cliente", Number(cliente));
  if (desde) query = query.gte("fecha_orden", desde);
  if (hasta) query = query.lte("fecha_orden", hasta);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

async function post(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearOrdenSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { servicios, tipo_tueste, tipo_molienda, tipo_empaque,
    observaciones, ...restoOrden } = parsed.data;

  const ahora = new Date();
  const fechaOrden = ahora.toISOString().split("T")[0];
  const horaCierre = ahora.toTimeString().slice(0, 5);

  const ordenData = {
    ...restoOrden,
    fecha_orden: fechaOrden,
    hora_cierre: horaCierre,
    proceso_cafe: restoOrden.proceso_cafe || null,
    zona_finca: restoOrden.zona_finca || null,
  };

  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .insert(ordenData)
    .select("*, clientes(nombre_completo)")
    .single();

  if (ordenError) return apiError(ordenError.message, 500);

  const servicioIds = servicios.filter((s) => s.servicio_id).map((s) => s.servicio_id!);
  const empaqueIds = servicios.filter((s) => s.empaque_id).map((s) => s.empaque_id!);

  const preciosServicios: Record<number, number> = {};
  const defaultPesos: Record<number, number | null> = {};
  const preciosEmpaques: Record<number, number> = {};

  if (servicioIds.length > 0) {
    const { data: preciosServ } = await supabase
      .from("servicio_precios")
      .select("id_servicio, precio_por_kg")
      .in("id_servicio", servicioIds)
      .is("valid_to", null);

    preciosServ?.forEach((p) => {
      preciosServicios[p.id_servicio] = Number(p.precio_por_kg);
    });

    const { data: maestros } = await supabase
      .from("servicios_maestro")
      .select("id_servicio_maestro, default_peso_kg")
      .in("id_servicio_maestro", servicioIds);

    maestros?.forEach((m) => {
      defaultPesos[m.id_servicio_maestro] = m.default_peso_kg != null ? Number(m.default_peso_kg) : null;
    });
  }

  if (empaqueIds.length > 0) {
    const { data: preciosEmp } = await supabase
      .from("empaque_precios")
      .select("id_empaque, precio")
      .in("id_empaque", empaqueIds)
      .is("valid_to", null);

    preciosEmp?.forEach((p) => {
      preciosEmpaques[p.id_empaque] = Number(p.precio);
    });
  }

  const serviciosData = servicios.map((s) => {
    const pesoKg = s.peso_inicial ?? (s.servicio_id ? defaultPesos[s.servicio_id] ?? null : null);
    const precioKg = s.override_precio
      ? s.precio
      : s.servicio_id
        ? preciosServicios[s.servicio_id] ?? s.precio ?? null
        : s.precio ?? null;
    const precioEmp = s.empaque_id ? preciosEmpaques[s.empaque_id] ?? 0 : 0;
    const lineaTotal = calcularLineaTotal({
      pesoKg,
      precioPorKg: precioKg,
      precioEmpaque: precioEmp,
    });

    return {
      id_orden: orden.id_orden,
      tipo_servicio: s.tipo_servicio,
      servicio_id: s.servicio_id ?? null,
      empaque_id: s.empaque_id ?? null,
      peso_inicial: s.peso_inicial ?? null,
      peso_kg: pesoKg,
      precio: s.precio ?? null,
      snapshot_precio_por_kg: precioKg,
      snapshot_precio_empaque: precioEmp,
      linea_total: lineaTotal,
      override_precio: s.override_precio ?? false,
      override_motivo: s.override_motivo ?? null,
    };
  });

  const { error: serviciosError } = await supabase
    .from("servicios_ejecutados")
    .insert(serviciosData);

  if (serviciosError) {
    await supabase.from("ordenes_trabajo").delete().eq("id_orden", orden.id_orden);
    return apiError(serviciosError.message, 500);
  }

  if (tipo_tueste || tipo_molienda || tipo_empaque || observaciones) {
    await supabase.from("especificaciones_orden").insert({
      id_orden: orden.id_orden,
      tipo_tueste: tipo_tueste || null,
      tipo_molienda: tipo_molienda || null,
      tipo_empaque: tipo_empaque || null,
      observaciones: observaciones || null,
    });
  }

  return apiOk(orden, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
