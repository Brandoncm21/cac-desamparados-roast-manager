import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { crearOrdenSchema } from "@/lib/schemas/ordenes";
import { crearPasosOrden } from "@/lib/services/orquestador";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

const filtrosOrdenesSchema = z.object({
  estado: z.enum(["Pendiente", "En Proceso", "Completado", "Cancelado"]).optional(),
  cliente: z.coerce.number().int().positive().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const filtros = filtrosOrdenesSchema.safeParse({
    estado: searchParams.get("estado") ?? undefined,
    cliente: searchParams.get("cliente") ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
  });
  if (!filtros.success) return apiValidationError(filtros.error.flatten());

  const { page, pageSize } = paginacion.data;
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;
  const busqueda = sanitizarBusqueda(searchParams.get("search"));

  let query = supabase
    .from("ordenes_trabajo")
    .select(
      "id_orden, numero_factura, fecha_orden, estado_orden, id_cliente, clientes(nombre_completo)",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("fecha_orden", { ascending: false })
    .order("id_orden", { ascending: false })
    .range(from, to);

  if (filtros.data.estado) query = query.eq("estado_orden", filtros.data.estado);
  if (filtros.data.cliente) query = query.eq("id_cliente", filtros.data.cliente);
  if (filtros.data.desde) query = query.gte("fecha_orden", filtros.data.desde);
  if (filtros.data.hasta) query = query.lte("fecha_orden", filtros.data.hasta);
  if (busqueda) {
    query = query.or(
      `numero_factura.ilike.%${busqueda}%,clientes.nombre_completo.ilike.%${busqueda}%`
    );
  }

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

async function post(request: NextRequest) {
  await requireRole(["Admin", "Recepción"]);
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
    estado_orden: "Pendiente",
  };

  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .insert(ordenData)
    .select("*, clientes(nombre_completo)")
    .single();

  if (ordenError) return apiError(ordenError.message, 500);

  try {
    await crearPasosOrden(
      supabase,
      orden.id_orden,
      servicios.map((s) => ({ servicio_id: s.servicio_id, tipo_servicio: s.tipo_servicio }))
    );
  } catch (err) {
    await supabase.from("ordenes_trabajo").delete().eq("id_orden", orden.id_orden);
    return apiError(err instanceof Error ? err.message : "Error creando pasos", 500);
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
