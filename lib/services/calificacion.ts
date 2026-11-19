import type { GRADOS_CALIFICACION } from "@/lib/schemas/beneficio";

export type GradoCalificacion = (typeof GRADOS_CALIFICACION)[number];

export interface DefectoCalculo {
  id_defecto: number;
  categoria: 1 | 2;
  proporcion: number;
  numero_defectos: number;
}

export interface TotalesCalificacion {
  totalDefectos: number;
  totalEquivalencia: number;
  cat1Defectos: number;
}

export function equivalenciaDefecto(conteo: number, proporcion: number): number {
  if (!Number.isFinite(conteo) || !Number.isFinite(proporcion) || proporcion <= 0) return 0;
  return Math.round((conteo / proporcion) * 100) / 100;
}

export function calcularTotales(defectos: DefectoCalculo[]): TotalesCalificacion {
  let totalDefectos = 0;
  let totalEquivalencia = 0;
  let cat1Defectos = 0;

  for (const defecto of defectos) {
    totalDefectos += defecto.numero_defectos;
    totalEquivalencia += equivalenciaDefecto(defecto.numero_defectos, defecto.proporcion);
    if (defecto.categoria === 1) cat1Defectos += defecto.numero_defectos;
  }

  return {
    totalDefectos,
    totalEquivalencia: Math.round(totalEquivalencia * 100) / 100,
    cat1Defectos,
  };
}

export function sugerirGradoVerde(
  totalEquivalencia: number,
  cat1Defectos: number
): GradoCalificacion {
  if (cat1Defectos === 0 && totalEquivalencia <= 5) return "Specialty";
  if (totalEquivalencia <= 8) return "Premium";
  if (totalEquivalencia <= 23) return "Exchange";
  return "Below Standard";
}

export function sugerirGradoTostado(quakers: number | null | undefined): GradoCalificacion {
  const conteo = quakers ?? 0;
  if (conteo <= 0) return "Specialty";
  if (conteo <= 3) return "Premium";
  return "Exchange";
}
