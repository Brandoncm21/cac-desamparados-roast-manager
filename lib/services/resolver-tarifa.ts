export interface TarifaServicio {
  id_precio: number;
  id_servicio: number;
  min_weight_kg: number;
  max_weight_kg: number | null;
  precio_por_kg: number;
}

export function resolverTarifaPorPeso(
  tarifas: TarifaServicio[],
  pesoKg: number
): TarifaServicio | null {
  if (!tarifas || tarifas.length === 0) return null;

  return tarifas.find((t) => {
    const minOk = pesoKg >= t.min_weight_kg;
    const maxOk = t.max_weight_kg === null || pesoKg < t.max_weight_kg;
    return minOk && maxOk;
  }) ?? null;
}

export function calcularCostoServicio(
  pesoFacturable: number,
  precioPorKg: number
): number {
  return pesoFacturable * precioPorKg;
}

export function calcularMerma(
  pesoInicial: number,
  pesoFinal: number
): { mermaKg: number; porcentaje: number | null } {
  const mermaKg = pesoInicial - pesoFinal;
  const porcentaje = pesoInicial > 0 ? (mermaKg / pesoInicial) * 100 : null;
  return { mermaKg, porcentaje };
}
