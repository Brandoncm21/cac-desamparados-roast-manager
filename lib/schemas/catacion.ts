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

/** 0–100 nullable (cataciones CBF: campos vacíos suelen quedar null) */
const porcentaje = z.preprocess(nullify, z.number()
  .min(0, "No puede ser negativo").max(100, "0–100").optional().nullable());
/** ≥ 0 nullable (densidades g/ml, contadores sueltos) */
const numeroNoNeg = z.preprocess(nullify, z.number().min(0, "No puede ser negativo").optional().nullable());

const fechaTz = z.string().optional().nullable().or(z.literal(""));

// ── Catación (48 atributos del snapshot real; disp. 2: c2cortado) ─────────────
export const catacionSchema = z.object({
  id_catacion_tueste: z.number().int().positive().optional(),
  /** FR-012: perfil, lote o ambos; la validación de "al menos uno" va en superRefine. */
  perfil_tueste_ref: z.string().uuid("Perfil de tueste inválido").optional().nullable().or(z.literal("")),
  producto_analizado: z.enum(["tueste", "verde"]).default("tueste"),
  id_lote: z.number().int().positive().optional().nullable(),
  nlote: z.string().trim().max(100).optional().nullable().or(z.literal("")),
  /** FR-004: al marcarla finalizada el lote pasa a 'Vendido'; si no, a 'En Catación'. */
  finalizada: z.boolean().optional().default(false),
  ffreposo: fechaTz,
  pfinales: porcentaje,

  // 1. Evaluación físico-visual
  limpio: porcentaje,
  defectuoso: porcentaje,
  overde: porcentaje,
  ccverde: porcentaje,
  quaker: porcentaje,
  rtostado: porcentaje,
  dfueste: numeroNoNeg,            // g/ml (Anexo C)
  cccalidad: porcentaje,

  // 2. Defectos Categoría 1
  c1agrio: porcentaje,
  c1hongos: porcentaje,
  c1cerezaseca: porcentaje,
  c1negro: porcentaje,
  c1insectos: porcentaje,
  c1me: porcentaje,

  // 3. Defectos Categoría 2
  c2flotador: porcentaje,
  c2averanado: porcentaje,
  c2pergamino: porcentaje,
  c2inmaduro: porcentaje,
  c2concha: porcentaje,
  c2insectos: porcentaje,
  c2cascara: porcentaje,
  c2pulpa: porcentaje,
  c2partido: porcentaje,
  c2cortado: porcentaje,           // disp. 2: campo existe con campo UI
  c2mordido: porcentaje,
  c2negrop: porcentaje,
  c2agriop: porcentaje,

  // 4. Zarandas
  tres_sobre_dieciseis: porcentaje,
  veinte: porcentaje,
  diecinueve: porcentaje,
  dieciocho: porcentaje,
  diecisiete: porcentaje,
  dieciseis: porcentaje,
  quince: porcentaje,
  catorce: porcentaje,
  trece: porcentaje,

  // 5. Agtron
  tonagton_25: porcentaje,
  tonagton_35: porcentaje,
  tonagton_45: porcentaje,
  tonagton_55: porcentaje,
  tonagton_65: porcentaje,
  tonagton_75: porcentaje,
  tonagton_85: porcentaje,
  tonagton_95: porcentaje,
}).superRefine((val, ctx) => {
  const tienePerfil = typeof val.perfil_tueste_ref === "string" && val.perfil_tueste_ref.length > 0;
  const tieneLote = typeof val.id_lote === "number";
  if (!tienePerfil && !tieneLote) {
    ctx.addIssue({
      code: "custom",
      path: ["perfil_tueste_ref"],
      message: "Seleccione un perfil de tueste o un lote",
    });
  }
});

export const rondaSchema = z.object({
  id: z.number().int().positive().optional(),
  valor_calidad: z.preprocess(
    nullify,
    z.number().min(0, "La ronda va de 0 a 100").max(100, "La ronda va de 0 a 100").optional().nullable()
  ),
});

export const guardarCatacionBodySchema = z.object({
  catacion: catacionSchema,
  rondas: z.array(rondaSchema).min(1, "Registre al menos una ronda de calidad"),
});

export type CatacionPayload = z.infer<typeof catacionSchema>;
export type RondaPayload = z.infer<typeof rondaSchema>;
export type GuardarCatacionBody = z.infer<typeof guardarCatacionBodySchema>;

// Enviar a proceso (e1): trilla completada → orden CafeTrack
export const enviarProcesoBodySchema = z.object({
  id_trilla: z.preprocess(
    nullify,
    z.number({ message: "id_trilla requerido" }).int().positive({ message: "id_trilla inválido" })
  ),
});

export type EnviarProcesoBody = z.infer<typeof enviarProcesoBodySchema>;
