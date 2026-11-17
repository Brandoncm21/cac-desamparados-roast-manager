/**
 * Formateo de valores de dominio para la UI.
 *
 * Los importes llegan como `NUMERIC` de Postgres, así que pueden venir como
 * `string`; centralizar la conversión evita repetir `Number(x).toLocaleString()`
 * por toda la aplicación y unifica el marcador de ausencia.
 */

/** Marcador único para un valor ausente o inválido. */
export const SIN_VALOR = "—";

function aNumero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Importe en colones. El `locale` es explícito solo en los tests; en la UI se
 * delega en el locale del entorno para no forzar un formato distinto al actual.
 */
export function formatearColones(
  valor: number | string | null | undefined,
  locale?: string
): string {
  const numero = aNumero(valor);
  if (numero === null) return SIN_VALOR;
  return `₡${numero.toLocaleString(locale)}`;
}

export function formatearPeso(valor: number | string | null | undefined): string {
  const numero = aNumero(valor);
  if (numero === null) return SIN_VALOR;
  return `${numero} kg`;
}

export function formatearPorcentaje(valor: number | string | null | undefined): string {
  const numero = aNumero(valor);
  if (numero === null) return SIN_VALOR;
  return `${numero}%`;
}
