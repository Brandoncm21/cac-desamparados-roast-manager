import { z } from "zod";

/**
 * Esquemas del flujo Beneficiado / Acopio (spec 005).
 *
 * Unidades: los porcentajes van en 0–100; el pH de miel es numérico (0–14);
 * los pesos en kg; las temperaturas en °C. Los mensajes nombran la unidad para
 * que el 422 sea accionable en la UI.
 */

/** Normaliza "" y NaN (inputs numéricos vacíos de RHF) a null. */
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

export const PROCESOS_BENEFICIO = ["Lavado", "Honey", "Natural", "Otro"] as const;

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
  numero_lote: z.string().trim().min(1, "El número de lote es obligatorio").max(100),
  numero_recibo: z.string().trim().min(1, "El número de recibo es obligatorio").max(50),
  factura: textoOpcional(50),
  productor_id: z.number().int().positive("El productor es obligatorio"),
  finca_id: z.number().int().positive("La finca es obligatoria"),
  varietal: textoOpcional(100),
  cajuelas: enteroOpcional,
  cuartillos: enteroOpcional,
  porcentaje_flote: porcentaje,
  porcentaje_broca: porcentaje,
  porcentaje_vano: porcentaje,
  porcentaje_verde: porcentaje,
  porcentaje_secos: porcentaje,
  ph_miel: z.preprocess(
    (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
    z.number().min(0, "El pH mínimo es 0").max(14, "El pH máximo es 14").optional().nullable()
  ),
  puro_impuro: z.boolean().optional(),
  limpio_sucio: z.boolean().optional(),
  rango_objetivo: enteroOpcional,
  rango_sobre_objetivo: enteroOpcional,
  rango: enteroOpcional,
  proceso: z.enum(PROCESOS_BENEFICIO).optional().nullable(),
  fecha_recibido: z.string().optional().nullable().or(z.literal("")),
};

export const crearRecibidoSchema = z.object(recibidoCampos).transform((v) => ({
  ...v,
  puro_impuro: v.puro_impuro ?? true,
  limpio_sucio: v.limpio_sucio ?? true,
}));

/** PUT parcial: sin defaults para no pisar columnas que no vienen en el body. */
export const actualizarRecibidoSchema = z.object(recibidoCampos).partial();

export const listarRecibidoFiltrosSchema = z.object({
  enproceso: z.enum(ESTADOS_BENEFICIO).optional().or(z.literal("")),
  productor_id: z.number().int().positive().optional(),
  finca_id: z.number().int().positive().optional(),
  desde: fechaOpcional,
  hasta: fechaOpcional,
});

// ── Caracterización de materia prima ────────────────────────────────────────
export const caracterizacionSchema = z.object({
  fecha_hora: z.string().optional().nullable().or(z.literal("")),
  proceso: textoOpcional(50),
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
  escala_maduracion: textoOpcional(50),
  rango_optimo_madurez: textoOpcional(50),
  muestreo_tabla: numeroOpcional,
  pct_verdes_muestra: porcentaje,
  pct_debajo_objetivo_muestra: porcentaje,
  pct_objetivo_muestra: porcentaje,
  pct_encima_objetivo_muestra: porcentaje,
  pct_secas_muestra: porcentaje,
  g_vanos: numeroOpcional,
  g_secos: numeroOpcional,
  g_broca: numeroOpcional,
});

// ── Secado ──────────────────────────────────────────────────────────────────
export const secadoSchema = z
  .object({
    tiempo_secado: textoOpcional(50),
    fecha_inicio_secado: fechaOpcional,
    fecha_finalizacion_secado: fechaOpcional,
    dias_secado: enteroOpcional,
    numero_cama: textoOpcional(50),
    porcentaje_solar: porcentaje,
    porcentaje_mecanico: porcentaje,
    humedad_1: numeroOpcional,
    humedad_2: numeroOpcional,
    humedad_3: numeroOpcional,
    humedad_4: numeroOpcional,
    humedad_5: numeroOpcional,
    humedad_6: numeroOpcional,
    tem_1: numeroOpcional,
    tem_2: numeroOpcional,
    tem_3: numeroOpcional,
    tem_4: numeroOpcional,
    tem_5: numeroOpcional,
    tem_6: numeroOpcional,
    peso_inicial: numeroOpcional,
    peso_final: numeroOpcional,
  })
  .refine(
    (v) =>
      !v.fecha_inicio_secado ||
      !v.fecha_finalizacion_secado ||
      v.fecha_finalizacion_secado >= v.fecha_inicio_secado,
    {
      message: "La fecha de finalización no puede ser anterior a la de inicio",
      path: ["fecha_finalizacion_secado"],
    }
  );

// ── Bodegaje ────────────────────────────────────────────────────────────────
export const bodegajeSchema = z.object({
  inicio_reposo: fechaOpcional,
  cantidad_sacos: enteroOpcional,
  peso_pergamino: numeroOpcional,
  peso_bellota: numeroOpcional,
  humedad_inicial: numeroOpcional,
  humedad_final: numeroOpcional,
  densidad_pergamino: numeroOpcional,
  densidad_bellota: numeroOpcional,
  lectura_humedad_relativa: porcentaje,
  lectura_temperatura_interna: numeroOpcional,
  lectura_temperatura_externa: numeroOpcional,
});

// ── Trilla ──────────────────────────────────────────────────────────────────
export const trillaSchema = z.object({
  fecha_final_reposo: fechaOpcional,
  rendimiento_teorico_pelado: porcentaje,
  rendimiento_teorico_seleccion: porcentaje,
  rendimiento_final_pelado: porcentaje,
  rendimiento_final_seleccion: porcentaje,
  peso_en_verde_teorico: numeroOpcional,
  peso_verde_final: z.preprocess(
    (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
    z
      .number()
      .positive("El peso en verde final (kg) es obligatorio para cerrar la trilla")
  ),
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
});

// ── Catación (simplificada) ─────────────────────────────────────────────────
export const catacionSchema = z.object({
  catado: z.boolean(),
  notas_catacion: textoOpcional(2000),
});

export const guardarCatacionSchema = catacionSchema.extend({
  id_lote: z.number().int().positive("La catación debe estar vinculada a un lote"),
});

// ── Calificación (verde + tostado) ──────────────────────────────────────────
/** Atributos sensoriales: enteros de 1 a 10. */
const atributo = z.preprocess(
  (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
  z
    .number()
    .int("El atributo debe ser un entero de 1 a 10")
    .min(1, "El atributo mínimo es 1")
    .max(10, "El atributo máximo es 10")
    .optional()
    .nullable()
);

const calificacionCampos = {
  // Bloque verde: análisis físico del café verde.
  humedad: porcentaje,
  densidad: z.preprocess(
    (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
    z
      .number()
      .positive("La densidad debe ser mayor que 0")
      .optional()
      .nullable()
  ),
  defectos_primarios: enteroOpcional,
  defectos_secundarios: enteroOpcional,
  porcentaje_verde: porcentaje,
  // Bloque tostado: puntaje y atributos sensoriales.
  puntaje_sca: porcentaje,
  fragancia: atributo,
  acidez: atributo,
  cuerpo: atributo,
  dulzor: atributo,
  balance: atributo,
  notas: textoOpcional(2000),
};

/** El tostado solo se califica si el verde ya está cargado (FR-003). */
const verdeAntesQueTostado = {
  message: "Registre primero el análisis del café verde (humedad)",
  path: ["puntaje_sca"] as string[],
};

const exigeVerde = (v: { puntaje_sca?: number | null; humedad?: number | null }) =>
  v.puntaje_sca == null || v.humedad != null;

export const calificacionSchema = z
  .object(calificacionCampos)
  .refine(exigeVerde, verdeAntesQueTostado);

export const guardarCalificacionSchema = z
  .object({
    ...calificacionCampos,
    id_lote: z.number().int().positive("La calificación debe estar vinculada a un lote"),
  })
  .refine(exigeVerde, verdeAntesQueTostado);

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
