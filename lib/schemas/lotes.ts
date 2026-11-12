import { z } from "zod";

/** Numéricos ≥0: NaN (inputs vacíos de RHF con valueAsNumber) y "" se normaliza a null. */
const numeroNoNegativo = z.preprocess(
  (v) => ((typeof v === "number" && Number.isNaN(v)) || v === "" ? null : v),
  z.number().min(0).optional().nullable()
);

/** Estados del lote (CHECK en DB; `0039` añadió 'En Catación'). */
export const ENPROCESO_LOTE = [
  "No",
  "En Secado",
  "En Trilla",
  "En Bodega",
  "En Catación",
  "Vendido",
] as const;

/** Beneficio/proceso del lote (editable en trilla y bodega — spec 004 D9/P2). */
export const PROCESO_CAFE = ["Lavado", "Honey", "Natural", "Otro"] as const;

const booleanFalso = z.boolean().optional().default(false);

export const crearLoteSchema = z.object({
  nlote: z.string().min(1, "El número de lote es obligatorio").max(100),
  nrecibo: z.number().int().min(0, "Número de recibo inválido"),
  // Productor (cliente) y finca: FKs reales (spec 004 D2/D3). Reemplazan nproductor/nfinca/zona/altura.
  id_cliente: z.number().int().positive("El productor es obligatorio"),
  id_finca: z.number().int().positive("La finca es obligatoria"),
  robjetivo: numeroNoNegativo,
  rtotal: numeroNoNegativo,
  disponible: numeroNoNegativo,
  vendido: booleanFalso,
  enproceso: z.enum(ENPROCESO_LOTE).optional().default("No"),
  proceso_cafe: z.enum(PROCESO_CAFE).optional().nullable(),
  // Despulpado: 5 booleans conservados por paridad con CBF (FR-010)
  semilavado: booleanFalso,
  natural: booleanFalso,
  anaerobico: booleanFalso,
  miel: booleanFalso,
  lavado: booleanFalso,
  otro: z.string().max(100).optional().nullable().or(z.literal("")),
  // Pruebas físicas del beneficiado húmedo (portadas tal cual CBF)
  pf_pulpa_pergamino: numeroNoNegativo,
  pf_dmecanicos: numeroNoNegativo,
  pf_segundas: numeroNoNegativo,
  pf_pergamino_pulpa: numeroNoNegativo,
  pdensidad_fruta: numeroNoNegativo,
  pdensidad_pergamino_humedo: numeroNoNegativo,
  // Fecha real de acopio (corrige disp. 7); si no viene, el servidor usa now()
  fecha_acopio: z.string().optional().nullable().or(z.literal("")),
});

export const actualizarLoteSchema = crearLoteSchema.partial().omit({ nlote: true });

/** Filtros del listado (validados con 422 si están mal formados — FR-002). */
export const listarLotesFiltrosSchema = z.object({
  enproceso: z.enum(ENPROCESO_LOTE).optional().or(z.literal("")),
  id_finca: z.number().int().positive().optional(),
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  hasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
});

export type CrearLoteInput = z.infer<typeof crearLoteSchema>;
export type ActualizarLoteInput = z.infer<typeof actualizarLoteSchema>;
export type ListarLotesFiltros = z.infer<typeof listarLotesFiltrosSchema>;
export type EnprocesoLote = (typeof ENPROCESO_LOTE)[number];
export type ProcesoCafe = (typeof PROCESO_CAFE)[number];
