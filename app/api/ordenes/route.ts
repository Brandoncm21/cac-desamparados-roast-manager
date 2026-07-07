import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearOrdenSchema } from "@/lib/schemas/ordenes";
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

  const ordenData = {
    ...restoOrden,
    proceso_cafe: restoOrden.proceso_cafe || null,
    zona_finca: restoOrden.zona_finca || null,
    hora_cierre: restoOrden.hora_cierre || null,
  };

  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .insert(ordenData)
    .select("*, clientes(nombre_completo)")
    .single();

  if (ordenError) return apiError(ordenError.message, 500);

  const serviciosData = servicios.map((s) => ({
    id_orden: orden.id_orden,
    tipo_servicio: s.tipo_servicio,
    peso_inicial: s.peso_inicial,
    precio: s.precio,
  }));

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
