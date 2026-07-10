import type { HitoRecord } from "@/lib/offline/db";

export const HITOS_RAPIDOS = [
  "Turning Point",
  "Amarillo",
  "Marrón",
  "Crack Inicial",
  "Crack Final",
  "Segundo Crack",
  "Final",
  "Tiempo Enfriamiento",
] as const;

export type HitoRapido = (typeof HITOS_RAPIDOS)[number];

export interface Empleado {
  id_empleado: number;
  nombre: string;
  rol: string;
}

export interface OrdenTrabajoResumen {
  numero_factura: string;
}

export interface EmpleadoRelacionado {
  nombre: string;
}

export interface PerfilTueste {
  id_perfil: number;
  id_orden?: number | null;
  numero_lote?: string | null;
  fecha_tueste?: string | null;
  id_tostador?: number | null;
  nombre_cafe?: string | null;
  temperatura_sala?: number | null;
  humedad_sala?: number | null;
  tiempo_desarrollo_min?: number | null;
  dtr_porcentaje?: number | null;
  fecha_optima_consumo?: string | null;
  fecha_vencimiento?: string | null;
  estado?: string | null;
  empleados?: EmpleadoRelacionado | null;
  ordenes_trabajo?: OrdenTrabajoResumen | null;
}

export interface MetricaTueste {
  id_perfil: number;
  tipo_metrica: string;
  valor_antes?: number | null;
  valor_despues?: number | null;
  porcentaje_diferencia?: number | null;
}

export interface MetricaLocal {
  tipo_metrica: string;
  valor_antes: string;
  valor_despues: string;
}

export interface AjusteTueste {
  id_ajuste: number;
  id_perfil: number;
  orden_secuencia: number;
  tiempo?: number | null;
  temperatura_ajuste?: number | null;
  llama?: string | null;
  aire?: string | null;
}

export interface AjusteLocal {
  id?: number;
  orden_secuencia: number;
  tiempo: string;
  temperatura_ajuste: string;
  llama: string;
  aire: string;
  _isNew?: boolean;
}

export interface PuntoTemperatura {
  minuto: number;
  temperatura: number;
}

export interface HitoEditData {
  tiempo_min: string;
  temperatura: string;
}

export interface ContextoUpdate {
  nombre_cafe: string | null;
  id_tostador: number | null;
  temperatura_sala: number | null;
  humedad_sala: number | null;
}

export interface ResumenTueste {
  tiempo_desarrollo_min?: number | null;
  dtr_porcentaje?: number | null;
  fecha_optima_consumo?: string | null;
  fecha_vencimiento?: string | null;
  estado?: string | null;
  metricas: MetricaTueste[];
}

export { HitoRecord };
