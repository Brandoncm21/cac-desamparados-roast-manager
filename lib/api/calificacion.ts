import type {
  COLORES_CAFE_VERDE,
  GRADOS_CALIFICACION,
  OLORES_CAFE_VERDE,
} from "@/lib/schemas/beneficio";
import { leerJson } from "./http";

export interface DefectoCalificacionCatalogo {
  id_defecto: number;
  codigo: string;
  nombre: string;
  tipo_cafe: "verde" | "tostado";
  categoria: 1 | 2 | null;
  proporcion: number;
  orden: number;
}

export interface CatalogosCalificacion {
  defectos: DefectoCalificacionCatalogo[];
  colores: typeof COLORES_CAFE_VERDE;
  olores: typeof OLORES_CAFE_VERDE;
  grados: typeof GRADOS_CALIFICACION;
}

export async function obtenerCatalogosCalificacion(): Promise<CatalogosCalificacion> {
  const res = await fetch("/api/calificacion/catalogos");
  return leerJson<CatalogosCalificacion>(res);
}
