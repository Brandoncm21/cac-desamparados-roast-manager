import { z } from "zod";

/** Numéricos: NaN (inputs vacíos de RHF con valueAsNumber) y "" se normaliza a null. */
const nullifyGracias = (v: unknown) =>
  (typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v;

const porcentaje = z.preprocess(nullifyGracias, z.number().min(0).max(100).optional().nullable());
const numeroNoNeg = z.preprocess(nullifyGracias, z.number().min(0).optional().nullable());
const fechaTz = z.string().min(1).optional().nullable().or(z.literal(""));

// ── Caracterización (FR: lógica soberana — campos exactos del modelo CBF) ─────
export const guardarCaracterizacionSchema = z.object({
  id_caracterizacion: z.number().int().positive().optional(),
  tiempo: z.string().min(1, "La fecha/hora del muestreo es obligatoria"),
  proceso: z.string().max(100).optional().nullable().or(z.literal("")),
  l_asignado: z.string().max(50).optional().nullable().or(z.literal("")),
  c_verdes: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  c_objetivo: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  c_inmaduras: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  c_sobremaduras: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  c_secas: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  vanos: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  secos: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  dr_maduras: numeroNoNeg,
  densidad: numeroNoNeg,
  m_tabla: numeroNoNeg,
  e_maduracion: numeroNoNeg,
  broca: porcentaje,
  pc_debajo: porcentaje,
  pc_verdes: porcentaje,
  pc_secas: porcentaje,
  pc_encima: porcentaje,
  pc_objetivo: porcentaje,
});

export const rcSchema = z.object({
  tipo_rc: z.enum(["maduras", "inmaduras", "sobremaduras"]),
  gbx: numeroNoNeg,
  promedio: numeroNoNeg,
  observaciones: z.string().max(500).optional().nullable().or(z.literal("")),
});

export const guardarCaracterizacionBodySchema = z.object({
  caracterizacion: guardarCaracterizacionSchema,
  rcs: z.array(rcSchema).max(3).optional().nullable().or(z.literal("")),
});

// ── Secado (+4 series) ────────────────────────────────────────────────────────
export const guardarSecadoSchema = z.object({
  id_secado: z.number().int().positive().optional(),
  finicio: z.string().min(1, "La fecha/hora de inicio es obligatoria"),
  ffinal: fechaTz,
}).refine((d) => !(d.ffinal && new Date(d.ffinal) <= new Date(d.finicio)), {
  message: "La fecha de fin debe ser posterior al inicio",
  path: ["ffinal"],
});

export const serieHumedadSchema = z.object({
  id: z.number().int().positive().optional(),
  fecha: z.string().min(1, "La fecha de la medición es obligatoria"),
  humedad: z.number().min(0, "La humedad va de 0 a 100").max(100, "La humedad va de 0 a 100"),
});

export const serieAmbienteSchema = z.object({
  id: z.number().int().positive().optional(),
  fecha: z.string().min(1, "La fecha de la medición es obligatoria"),
  temperatura: z
    .number()
    .min(-50, "La temperatura ambiente va de -50 a 70 °C")
    .max(70, "La temperatura ambiente va de -50 a 70 °C"),
  humedad_ambiente: z.number().min(0).max(100),
});

export const serieTemperaturaSchema = z.object({
  id: z.number().int().positive().optional(),
  fecha: z.string().min(1, "La fecha de la medición es obligatoria"),
  temperatura: z.number().min(0).max(100, "La temperatura del café va de 0 a 100 °C"),
});

export const serieCamaSchema = z.object({
  id: z.number().int().positive().optional(),
  numero_cama: z.string().min(1, "El número de cama es obligatorio").max(50),
});

export const guardarSecadoBodySchema = z.object({
  secado: guardarSecadoSchema,
  humedades: z.array(serieHumedadSchema).optional().nullable().or(z.literal("")),
  ambientes: z.array(serieAmbienteSchema).optional().nullable().or(z.literal("")),
  temperaturas: z.array(serieTemperaturaSchema).optional().nullable().or(z.literal("")),
  camas: z.array(serieCamaSchema).optional().nullable().or(z.literal("")),
});

// ── Bodega (+ n:m secados guardados, disp. 13: objeto con cantidad_sacos) ─────
export const guardarBodegaSchema = z.object({
  id_bodega: z.number().int().positive().optional(),
  finicio_reposo: fechaTz,
  cantidad_sacos: z.preprocess(nullifyGracias, z.number().int().min(0).optional().nullable()),
  w_bellota: numeroNoNeg,
  w_pergamino: numeroNoNeg,
  hinicial: porcentaje,
  hfinal: porcentaje,
  d_bellota: numeroNoNeg,
  d_pergamino: numeroNoNeg,
  pmh_relativa: numeroNoNeg,
  pmt_interna: numeroNoNeg,
  pmt_externa: numeroNoNeg,
});

export const secadoGuardadoSchema = z.object({
  id_secado: z.number().int().positive("Seleccione un secado"),
  cantidad_sacos: z.number().int().min(1, "Los sacos deben ser al menos 1"),
});

export const guardarBodegaBodySchema = z.object({
  bodega: guardarBodegaSchema,
  secados_guardados: z.array(secadoGuardadoSchema).optional().nullable().or(z.literal("")),
});

// ── Trilla (+ peso_verde 1:1 con toggle) ──────────────────────────────────────
export const guardarTrillaSchema = z.object({
  id_trilla: z.number().int().positive().optional(),
  ffinal_reposo: fechaTz,
  hinicial: porcentaje,
  hfinal: porcentaje,
  rfinal_pelado: porcentaje,
  rfinal_seleccion: porcentaje,
  rteorico_pelado: porcentaje,
  rteorico_seleccion: porcentaje,
  wverde_teorico: numeroNoNeg,
  wverde_final: numeroNoNeg,
  psegundas: porcentaje,
  pcataduras: porcentaje,
  pbarreduras: porcentaje,
  pescogeduras: porcentaje,
  pcaracolillo: porcentaje,
  pprimera: porcentaje,
  pmadres: porcentaje,
  pmenudos: porcentaje,
  pinferiores: porcentaje,
});

export const pesoVerdeSchema = z.object({
  winferiores: numeroNoNeg,
  wfinal: numeroNoNeg,
  wfinal_inferiores: numeroNoNeg,
});

export const guardarTrillaBodySchema = z.object({
  trilla: guardarTrillaSchema,
  peso_verde: pesoVerdeSchema.optional().nullable().or(z.literal("")),
});

export type GuardarCaracterizacionInput = z.infer<typeof guardarCaracterizacionSchema>;
export type GuardarSecadoInput = z.infer<typeof guardarSecadoSchema>;
export type GuardarBodegaInput = z.infer<typeof guardarBodegaSchema>;
export type GuardarTrillaInput = z.infer<typeof guardarTrillaSchema>;
