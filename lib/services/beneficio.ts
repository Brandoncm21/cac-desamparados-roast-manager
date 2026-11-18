/**
 * Lógica pura del flujo Beneficiado / Acopio.
 *
 * Sin React ni red: aquí viven los cálculos que la UI necesita (porcentajes de
 * maduración, promedio de °Bx, secuencia de estados) para poder testearlos.
 */

export const SECUENCIA_BENEFICIO = [
  "Recibido",
  "En Caracterización",
  "En Secado",
  "En Bodega",
  "En Trilla",
  "Catado",
] as const;

export interface ConteosMaduracion {
  cerezas_verdes?: number | null;
  cerezas_semimaduras?: number | null;
  cerezas_en_objetivo?: number | null;
  cerezas_sobremaduras?: number | null;
  cerezas_secas?: number | null;
}

export type PorcentajesMaduracion = Record<keyof ConteosMaduracion, number>;

const CAMPOS_MADURACION: (keyof ConteosMaduracion)[] = [
  "cerezas_verdes",
  "cerezas_semimaduras",
  "cerezas_en_objetivo",
  "cerezas_sobremaduras",
  "cerezas_secas",
];

/** Porcentaje de cada estado de maduración sobre el total contado (0 si no hay datos). */
export function calcularPorcentajesMaduracion(
  conteos: ConteosMaduracion
): PorcentajesMaduracion {
  const total = CAMPOS_MADURACION.reduce(
    (acc, campo) => acc + (Number(conteos[campo]) || 0),
    0
  );

  const resultado = {} as PorcentajesMaduracion;
  for (const campo of CAMPOS_MADURACION) {
    resultado[campo] =
      total > 0 ? Math.round(((Number(conteos[campo]) || 0) / total) * 1000) / 10 : 0;
  }
  return resultado;
}

/** Promedio de las lecturas de refractómetro (°Bx), redondeado a 2 decimales. */
export function promedioBx(
  lecturas: (number | null | undefined)[]
): number | null {
  const validas = lecturas.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  if (validas.length === 0) return null;
  const suma = validas.reduce((acc, v) => acc + v, 0);
  return Math.round((suma / validas.length) * 100) / 100;
}

/** Siguiente estado del flujo (null si ya está catado o vendido). */
export function siguienteEstado(actual: string | null | undefined): string | null {
  const indice = SECUENCIA_BENEFICIO.indexOf(
    (actual ?? "") as (typeof SECUENCIA_BENEFICIO)[number]
  );
  if (indice === -1 || indice === SECUENCIA_BENEFICIO.length - 1) return null;
  return SECUENCIA_BENEFICIO[indice + 1] ?? null;
}

/** Un lote vendido no admite cambios de etapa. */
export function esEtapaEditable(enproceso: string | null | undefined): boolean {
  return enproceso !== "Vendido";
}

/** Porcentaje de una parte sobre un total, o null si el total no es válido. */
export function porcentajeDe(
  parte: number | null | undefined,
  total: number | null | undefined
): number | null {
  if (parte == null || total == null || total <= 0) return null;
  return Math.round((parte / total) * 1000) / 10;
}
