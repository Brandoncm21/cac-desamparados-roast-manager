import { z } from "zod";

/** Numéricos: "" / NaN de inputs RHF → null; strings ("84.5") → Number (coma → punto). */
const nullify = (v: unknown) => {
  if ((typeof v === "number" && Number.isNaN(v)) || v === "") return null;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  return v;
};

/** Notas libres: vacío o solo espacios → null; se guardan recortadas. */
const notasCatacion = z.preprocess(
  (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") return v;
    const limpio = v.trim();
    return limpio === "" ? null : limpio;
  },
  z.string().max(2000, "Máximo 2000 caracteres").nullable()
);

/**
 * Catación mínima: un registro por lote, con la marca de catado y las notas.
 *
 * Los atributos de cata detallados (defectos, zarandas, Agtron) y las rondas de
 * calidad se retiraron del dominio en la migración `0048`.
 */
export const catacionSchema = z.object({
  id_catacion_tueste: z.number().int().positive().optional(),
  /** Obligatorio: no existe catación sin lote. */
  id_lote: z
    .number({ message: "Seleccione un lote" })
    .int("Seleccione un lote")
    .positive("Seleccione un lote"),
  catado: z.boolean().default(false),
  notas_catacion: notasCatacion.default(null),
});

export type CatacionPayload = z.infer<typeof catacionSchema>;

// Enviar a proceso (e1): trilla completada → orden CafeTrack
export const enviarProcesoBodySchema = z.object({
  id_trilla: z.preprocess(
    nullify,
    z.number({ message: "id_trilla requerido" }).int().positive({ message: "id_trilla inválido" })
  ),
});

export type EnviarProcesoBody = z.infer<typeof enviarProcesoBodySchema>;
