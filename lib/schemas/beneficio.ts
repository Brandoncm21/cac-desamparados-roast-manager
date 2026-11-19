import { z } from "zod";

/**
 * Esquemas del flujo Beneficiado / Acopio (spec 005).
 */

const numeroOpcional = z.preprocess(
  (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
  z.number().optional().nullable()
);

const porcentaje = z.preprocess(
  (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
  z.number().min(0, "El porcentaje no puede ser negativo").max(100, "El porcentaje máximo es 100").optional().nullable()
);

const enteroOpcional = z.preprocess(
  (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
  z.number().int("Debe ser un entero").min(0, "No puede ser negativo").optional().nullable()
);

const enteroRequerido = (mensaje: string) =>
  z.preprocess(
    (v) => (v === "" || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    z.number({ error: mensaje }).int("Debe ser un entero").min(0, "No puede ser negativo")
  );

const textoRequerido = (max: number, mensaje: string) =>
  z.string().trim().min(1, mensaje).max(max);

const decimalPositivoOpcional = z.preprocess(
  (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
  z.number().positive("Debe ser mayor que 0").optional().nullable()
);

const textoOpcional = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
  .optional()
  .nullable()
  .or(z.literal(""));

export const ESTADOS_BENEFICIO = [
  "Recibido",
  "En Caracterización",
  "En Secado",
  "En Bodega",
  "En Trilla",
  "Catado",
  "Calificado",
  "Vendido",
] as const;

export const PROCESOS_BENEFICIO = ["Lavado", "Honey", "Natural", "Miel", "Semilavado", "Anaeróbico", "Otro"] as const;

export const ESTADOS_LOTE_COMERCIAL = ["proceso", "disponible", "vendido"] as const;

export const GRADOS_CALIFICACION = [
  "Specialty",
  "Premium",
  "Exchange",
  "Below Standard",
] as const;

export const COLORES_CAFE_VERDE = [
  "Azul-Verde",
  "Azulado-Verde",
  "Verde",
  "Verdoso",
  "Amarillo-Verde",
  "Amarillo pálido",
  "Amarillo",
  "Cafezoso",
] as const;

export const OLORES_CAFE_VERDE = ["Olor extraño", "Limpio"] as const;

export const ETAPAS_BENEFICIO = [
  "caracterizacion",
  "secado",
  "bodegaje",
  "trilla",
  "catacion",
  "calificacion",
] as const;

export type EtapaBeneficio = (typeof ETAPAS_BENEFICIO)[number];

// ── Recibido de Café (nacimiento del lote) ──────────────────────────────────
const recibidoCampos = {
  numero_lote: textoOpcional(100),
  numero_recibo: textoOpcional(50),
  productor_id: z.number().int().positive("El productor es obligatorio"),
  finca_id: z.number().int().positive("La finca es obligatoria"),
  varietal: textoRequerido(100, "El varietal es obligatorio"),
  cajuelas: enteroRequerido("Las cajuelas son obligatorias"),
  cuartillos: enteroRequerido("Los cuartillos son obligatorios"),
  porcentaje_flote: porcentaje,
  porcentaje_broca: porcentaje,
  porcentaje_vano: porcentaje,
  porcentaje_verde: porcentaje,
  porcentaje_secos: porcentaje,
  porcentaje_segundas: porcentaje,
  porcentaje_danos_mecanicos: porcentaje,
  porcentaje_pulpa_pergamino: porcentaje,
  porcentaje_pergamino_pulpa: porcentaje,
  densidad_fruta: decimalPositivoOpcional,
  densidad_pergamino_humedo: decimalPositivoOpcional,
  porcentaje_puro: porcentaje,
  porcentaje_impuro: porcentaje,
  porcentaje_limpio: porcentaje,
  porcentaje_sucio: porcentaje,
  proceso: z.enum(PROCESOS_BENEFICIO).optional().nullable(),
  proceso_otro: textoOpcional(100),
  estado_lote: z.enum(ESTADOS_LOTE_COMERCIAL).optional().nullable(),
  fecha_recibido: z.string().optional().nullable().or(z.literal("")),
};

const validarProcesoOtro = (value: { proceso?: string | null; proceso_otro?: string | null }) => {
  if (value.proceso === "Otro") return Boolean(value.proceso_otro?.trim());
  return true;
};

export const crearRecibidoSchema = z.object(recibidoCampos).superRefine((v, ctx) => {
  if (!validarProcesoOtro(v)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Especifique el proceso",
      path: ["proceso_otro"],
    });
  }
});

/** PUT parcial: sin defaults para no pisar columnas que no vienen en el body. */
export const actualizarRecibidoSchema = z
  .object(recibidoCampos)
  .partial()
  .superRefine((v, ctx) => {
    if (v.proceso === "Otro" && !v.proceso_otro?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Especifique el proceso",
        path: ["proceso_otro"],
      });
    }
  });

export const listarRecibidoFiltrosSchema = z.object({
  enproceso: z.enum(ESTADOS_BENEFICIO).optional().or(z.literal("")),
  estado_lote: z.enum(ESTADOS_LOTE_COMERCIAL).optional().or(z.literal("")),
  productor_id: z.number().int().positive().optional(),
  finca_id: z.number().int().positive().optional(),
  desde: fechaOpcional,
  hasta: fechaOpcional,
});

// ── Caracterización de materia prima ────────────────────────────────────────
export const caracterizacionSchema = z
  .object({
    fecha_hora: z.string().optional().nullable().or(z.literal("")),
    proceso: z.enum(PROCESOS_BENEFICIO).optional().nullable(),
    proceso_otro: textoOpcional(100),
    cerezas_verdes: enteroOpcional,
    cerezas_semimaduras: enteroOpcional,
    cerezas_en_objetivo: enteroOpcional,
    cerezas_sobremaduras: enteroOpcional,
    cerezas_secas: enteroOpcional,
    semimadura_1: numeroOpcional,
    semimadura_2: numeroOpcional,
    semimadura_3: numeroOpcional,
    semimadura_4: numeroOpcional,
    semimadura_5: numeroOpcional,
    semimadura_bx_promedio: numeroOpcional,
    madura_1: numeroOpcional,
    madura_2: numeroOpcional,
    madura_3: numeroOpcional,
    madura_4: numeroOpcional,
    madura_5: numeroOpcional,
    madura_bx_promedio: numeroOpcional,
    sobremadura_1: numeroOpcional,
    sobremadura_2: numeroOpcional,
    sobremadura_3: numeroOpcional,
    sobremadura_4: numeroOpcional,
    sobremadura_5: numeroOpcional,
    sobremadura_bx_promedio: numeroOpcional,
    observaciones_aspecto_textura: textoOpcional(2000),
    densidad_g_ml: numeroOpcional,
    g_vanos: numeroOpcional,
    g_secos: numeroOpcional,
    g_broca: numeroOpcional,
  })
  .superRefine((v, ctx) => {
    if (v.proceso === "Otro" && !v.proceso_otro?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Especifique el proceso",
        path: ["proceso_otro"],
      });
    }
  });

// ── Secado ──────────────────────────────────────────────────────────────────
export const secadoSchema = z.object({
  fecha_inicio_secado: fechaOpcional,
  fecha_finalizacion_secado: fechaOpcional,
  numero_cama: textoOpcional(50),
  porcentaje_solar: porcentaje,
  porcentaje_mecanico: porcentaje,
  humedad_1: numeroOpcional,
  humedad_2: numeroOpcional,
  humedad_3: numeroOpcional,
  humedad_4: numeroOpcional,
  humedad_5: numeroOpcional,
  tem_1: numeroOpcional,
  tem_2: numeroOpcional,
  tem_3: numeroOpcional,
  tem_4: numeroOpcional,
  tem_5: numeroOpcional,
  peso_inicial: numeroOpcional,
  peso_final: numeroOpcional,
});

// ── Bodegaje ────────────────────────────────────────────────────────────────
export const bodegajeSchema = z.object({
  inicio_reposo: fechaOpcional,
  cantidad_sacos: enteroOpcional,
  peso_pergamino: numeroOpcional,
  peso_bellota: numeroOpcional,
  humedad_inicial: numeroOpcional,
  humedad_final: numeroOpcional,
});

// ── Trilla ──────────────────────────────────────────────────────────────────
export const trillaSchema = z.object({
  fecha_final_reposo: fechaOpcional,
  pruebas_fisicas_trilla: textoOpcional(2000),
  rendimiento_teorico_pelado: porcentaje,
  rendimiento_teorico_seleccion: porcentaje,
  rendimiento_final_pelado: porcentaje,
  rendimiento_final_seleccion: porcentaje,
  peso_en_verde_teorico: numeroOpcional,
  peso_verde_final: numeroOpcional,
  humedad_inicial_pergamino_bellota: numeroOpcional,
  humedad_final_verde: numeroOpcional,
  porcentaje_primera: porcentaje,
  porcentaje_madres: porcentaje,
  porcentaje_caracolillo: porcentaje,
  porcentaje_menudos: porcentaje,
  porcentaje_cataduras: porcentaje,
  porcentaje_segundas: porcentaje,
  porcentaje_barreduras: porcentaje,
  porcentaje_escogeduras: porcentaje,
  porcentaje_otras_inferiores: porcentaje,
  peso_en_verde_final: numeroOpcional,
  peso_verde_inferiores: numeroOpcional,
  peso_en_verde_final_inferior: numeroOpcional,
});

// ── Catación (simplificada) ─────────────────────────────────────────────────
export const catacionSchema = z.object({
  catado: z.boolean(),
  notas_catacion: textoOpcional(2000),
});

export const guardarCatacionSchema = catacionSchema.extend({
  id_lote: z.number().int().positive("La catación debe estar vinculada a un lote"),
});

// ── Calificación (hoja SCA verde + tostado) ────────────────────────────────
const conteoDefecto = z.preprocess(
  (v) => (v === "" || v == null ? 0 : v),
  z.number().int("El conteo debe ser un entero").min(0, "No puede ser negativo")
);

const defectoCalificacionSchema = z.object({
  id_defecto: z.number().int().positive(),
  numero_defectos: conteoDefecto,
});

const calificacionCampos = {
  nombre: textoOpcional(150),
  codigo: textoOpcional(100),
  fecha: fechaOpcional,
  grado: z.enum(GRADOS_CALIFICACION).optional().nullable(),
  humedad: porcentaje,
  color: z.enum(COLORES_CAFE_VERDE).optional().nullable(),
  olor: z.enum(OLORES_CAFE_VERDE).optional().nullable(),
  codigo_muestra_tostado: textoOpcional(100),
  quakers: enteroOpcional,
  grado_tostado: z.enum(GRADOS_CALIFICACION).optional().nullable(),
  defectos: z.array(defectoCalificacionSchema).max(30).default([]),
};

export const calificacionSchema = z.object(calificacionCampos);

export const guardarCalificacionSchema = z.object({
  ...calificacionCampos,
  id_lote: z.number().int().positive("La calificación debe estar vinculada a un lote"),
});

export const ETAPA_SCHEMAS = {
  caracterizacion: caracterizacionSchema,
  secado: secadoSchema,
  bodegaje: bodegajeSchema,
  trilla: trillaSchema,
  catacion: catacionSchema,
  calificacion: calificacionSchema,
} as const;

export type CrearRecibidoInput = z.infer<typeof crearRecibidoSchema>;
export type ActualizarRecibidoInput = z.infer<typeof actualizarRecibidoSchema>;
export type ListarRecibidoFiltros = z.infer<typeof listarRecibidoFiltrosSchema>;
export type EstadoBeneficio = (typeof ESTADOS_BENEFICIO)[number];
export type ProcesoBeneficio = (typeof PROCESOS_BENEFICIO)[number];
export type CaracterizacionInput = z.infer<typeof caracterizacionSchema>;
export type SecadoInput = z.infer<typeof secadoSchema>;
export type BodegajeInput = z.infer<typeof bodegajeSchema>;
export type TrillaInput = z.infer<typeof trillaSchema>;
export type CatacionInput = z.infer<typeof catacionSchema>;
export type CalificacionInput = z.infer<typeof calificacionSchema>;
