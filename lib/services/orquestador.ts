import type { SupabaseClient } from "@supabase/supabase-js";

export type EstadoPaso = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "OMITIDO";

export interface ServicioSeleccionado {
  servicio_id: number;
  tipo_servicio: string;
}

export interface PasoOrden {
  id_paso: number;
  id_orden: number;
  servicio_id: number;
  prioridad: number;
  estado: EstadoPaso;
  tipo_servicio?: string;
}

// Desempate estable: prioridad ASC, luego id ASC. Garantiza un orden
// determinista incluso con prioridades duplicadas.
export function ordenarPorPrioridadEstable<T extends { prioridad: number; id: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => a.prioridad - b.prioridad || a.id - b.id);
}

export async function crearPasosOrden(
  supabase: SupabaseClient,
  idOrden: number,
  servicios: ServicioSeleccionado[]
): Promise<PasoOrden[]> {
  if (!servicios.length) {
    throw new Error("Debe seleccionar al menos un servicio");
  }

  // Obtener prioridades vigentes de los servicios seleccionados
  const { data: maestros, error: maestrosError } = await supabase
    .from("servicios_maestro")
    .select("id_servicio_maestro, nombre, prioridad")
    .in("id_servicio_maestro", servicios.map((s) => s.servicio_id))
    .eq("activo", true);

  if (maestrosError) throw new Error(maestrosError.message);
  if (!maestros || maestros.length !== servicios.length) {
    throw new Error("Uno o más servicios seleccionados no existen o están inactivos");
  }

  const pasosData = servicios
    .map((s) => {
      const maestro = maestros.find((m) => m.id_servicio_maestro === s.servicio_id);
      if (!maestro) return null;
      return {
        id_orden: idOrden,
        servicio_id: s.servicio_id,
        prioridad: maestro.prioridad,
        estado: "PENDIENTE" as EstadoPaso,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    // Desempate estable por servicio_id para prioridades duplicadas
    .sort((a, b) => (a?.prioridad ?? 0) - (b?.prioridad ?? 0) || (a?.servicio_id ?? 0) - (b?.servicio_id ?? 0));

  const { data, error } = await supabase
    .from("orden_pasos")
    .insert(pasosData)
    .select("id_paso, id_orden, servicio_id, prioridad, estado");

  if (error) throw new Error(error.message);
  return data as PasoOrden[];
}

export async function validarOrdenPendiente(
  supabase: SupabaseClient,
  idOrden: number
): Promise<void> {
  const { data, error } = await supabase
    .from("ordenes_trabajo")
    .select("estado_orden")
    .eq("id_orden", idOrden)
    .single();

  if (error || !data) throw new Error("Orden no encontrada");
  if (data.estado_orden !== "Pendiente") {
    throw new Error("La orden debe estar en estado Pendiente");
  }
}

// Primer paso de la orden que aún no terminó (PENDIENTE o EN_PROCESO),
// ordenado por (prioridad, id_paso). Es el paso sobre el que debe operar el usuario.
export async function obtenerPasoActual(
  supabase: SupabaseClient,
  idOrden: number
): Promise<PasoOrden | null> {
  const { data, error } = await supabase
    .from("orden_pasos")
    .select("id_paso, id_orden, servicio_id, prioridad, estado")
    .eq("id_orden", idOrden)
    .in("estado", ["PENDIENTE", "EN_PROCESO"])
    .order("prioridad", { ascending: true })
    .order("id_paso", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PasoOrden | null;
}

// True si la orden aún tiene pasos por ejecutar.
export async function hayPasosPendientes(
  supabase: SupabaseClient,
  idOrden: number
): Promise<boolean> {
  const { count, error } = await supabase
    .from("orden_pasos")
    .select("id_paso", { count: "exact", head: true })
    .eq("id_orden", idOrden)
    .in("estado", ["PENDIENTE", "EN_PROCESO"]);

  if (error) throw new Error(error.message);
  return (count || 0) > 0;
}
