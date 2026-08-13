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
      codigo,
      nombre,
      descripcion,
      default_peso_kg,
      servicio_precios(precio_por_kg, valid_from)
    `)
    .eq("activo", true)
    .order("nombre");

  if (servError) return apiError(servError.message, 500);

  const serviciosConPrecio = (servicios || []).map((s) => {
    const precios = (s.servicio_precios || [])
      .filter((p: any) => !p.valid_to)
      .sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
    return {
      id_servicio_maestro: s.id_servicio_maestro,
      codigo: s.codigo,
      nombre: s.nombre,
      descripcion: s.descripcion,
      default_peso_kg: s.default_peso_kg,
      precio_por_kg: precios[0]?.precio_por_kg ?? null,
    };
  });

  const { data: empaques, error: empError } = await supabase
    .from("empaques")
    .select(`
      id_empaque,
      nombre,
      unit_weight_kg,
      empaque_precios(precio, valid_from)
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
      precio: precios[0]?.precio ?? null,
    };
  });

  return apiOk({ servicios: serviciosConPrecio, empaques: empaquesConPrecio });
}

export const GET = withErrorHandler(get);
