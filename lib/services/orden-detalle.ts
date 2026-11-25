/**
 * Reglas puras del detalle de una orden.
 *
 * Estaban dentro de la página; sacarlas permite testear el cálculo de
 * rendimiento y el total sin montar el componente.
 */

import { calcularTotalAcumulado, type PasoFlujo } from "./pasos-orden";

export interface MetricaTueste {
  tipo_metrica: string;
  valor_antes: number | null;
  valor_despues: number | null;
  porcentaje_diferencia: number | null;
}

/**
 * Rendimiento de una métrica: usa el porcentaje persistido y, si no existe, lo
 * deriva de los valores antes/después.
 */
export function calcularRendimiento(metrica: MetricaTueste): string {
  if (metrica.porcentaje_diferencia != null) {
    return `${metrica.porcentaje_diferencia}%`;
  }

  const { valor_antes, valor_despues } = metrica;
  if (valor_antes != null && valor_despues != null && valor_antes !== 0) {
    return `${(((valor_antes - valor_despues) / valor_antes) * 100).toFixed(2)}%`;
  }

  return "—";
}

export interface ServicioFacturado {
  linea_total: number | string | null;
  precio: number | string | null;
}

/** Total de la orden: prefiere el importe de línea sobre el precio suelto. */
export function totalServicios(servicios: readonly ServicioFacturado[]): number {
  return servicios.reduce(
    (suma, s) => suma + (Number(s.linea_total) || Number(s.precio) || 0),
    0
  );
}

/**
 * Total facturable de la orden.
 *
 * Fuente de verdad: los pasos del flujo ya COMPLETADOS en `orden_pasos`
 * (suma de `costo_total_paso`, que ya incluye subtotal + empaques).
 * Fallback: si no hay pasos completados (órdenes legacy), suma los
 * `linea_total ?? precio` de `servicios_ejecutados`.
 *
 * Nunca devuelve `NaN`: valores nulos/inválidos se tratan como 0.
 */
export interface OrdenConFacturacion {
  servicios_ejecutados: readonly ServicioFacturado[];
  orden_pasos: readonly PasoFlujo[] | null | undefined;
}

export function totalFacturaOrden(orden: OrdenConFacturacion): number {
  const pasos = orden.orden_pasos ?? [];
  const completados = pasos.filter((p) => p.estado === "COMPLETADO");
  if (completados.length > 0) {
    return calcularTotalAcumulado(completados);
  }
  return totalServicios(orden.servicios_ejecutados);
}
