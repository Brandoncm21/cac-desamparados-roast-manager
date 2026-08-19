import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function get(_request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();

  const { data: servicios, error: servError } = await supabase
    .from("servicios_maestro")
    .select(`
      id_servicio_maestro,
      nombre,
      descripcion,
      tipo,
      prioridad,
      servicio_precios(id_precio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
    `)
    .eq("activo", true)
    .eq("servicio_precios.activo", true)
    .order("prioridad");

  if (servError) return apiError(servError.message, 500);

  const serviciosConIntervalos = (servicios || []).map((s) => ({
    id_servicio_maestro: s.id_servicio_maestro,
    nombre: s.nombre,
    descripcion: s.descripcion,
    tipo: s.tipo,
    prioridad: s.prioridad,
    intervalos: (s.servicio_precios || []).map((p: any) => ({
      id_precio: p.id_precio,
      precio_por_kg: p.precio_por_kg,
      min_weight_kg: p.min_weight_kg,
      max_weight_kg: p.max_weight_kg,
    })),
  }));

  const { data: empaques, error: empError } = await supabase
    .from("empaques")
    .select(`
      id_empaque,
      nombre,
      unit_weight_kg,
      capacidad_kg,
      empaque_precios(precio, valid_from, valid_to)
    `)
    .eq("activo", true)
    .order("nombre");

  if (empError) return apiError(empError.message, 500);

  const empaquesConPrecio = (empaques || []).map((e) => {
    const precios = (e.empaque_precios || [])
      .filter((p: any) => !p.valid_to)
      .sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
    return {
      id_empaque: e.id_empaque,
      nombre: e.nombre,
      unit_weight_kg: e.unit_weight_kg,
      capacidad_kg: e.capacidad_kg,
      precio: precios[0]?.precio ?? null,
    };
  });

  return apiOk({ servicios: serviciosConIntervalos, empaques: empaquesConPrecio });
}

export const GET = withErrorHandler(get);
