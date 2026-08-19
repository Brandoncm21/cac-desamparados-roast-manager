export interface LineaCalculoInput {
  pesoKg: number | null | undefined;
  precioPorKg: number | null | undefined;
  precioEmpaque: number | null | undefined;
}

export function calcularLineaTotal({ pesoKg, precioPorKg, precioEmpaque }: LineaCalculoInput): number {
  const peso = pesoKg ?? 0;
  const precioKg = precioPorKg ?? 0;
  const empaque = precioEmpaque ?? 0;
  return peso * precioKg + empaque;
}
