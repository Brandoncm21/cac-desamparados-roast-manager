/** Acceso a `/api/servicios-activos`: catálogo de servicios y empaques vigentes. */

import { leerJson } from "./http";

export interface IntervaloServicio {
  id_precio: number;
  precio_por_kg: number;
  min_weight_kg: number;
  max_weight_kg: number | null;
}

export interface ServicioActivo {
  id_servicio_maestro: number;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  prioridad: number;
  intervalos: IntervaloServicio[];
}

export interface EmpaqueActivo {
  id_empaque: number;
  nombre: string;
  unit_weight_kg: number | null;
  capacidad_kg: number | null;
  precio: number | null;
}

export interface CatalogoActivo {
  servicios: ServicioActivo[];
  empaques: EmpaqueActivo[];
}

export async function listarServiciosActivos(): Promise<CatalogoActivo> {
  const res = await fetch("/api/servicios-activos");
  return leerJson<CatalogoActivo>(res);
}
