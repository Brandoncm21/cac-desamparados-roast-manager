/**
 * Reglas puras del detalle de una orden.
 *
 * Estaban dentro de la página; sacarlas permite testear el cálculo de
 * rendimiento y el total sin montar el componente.
 */

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
