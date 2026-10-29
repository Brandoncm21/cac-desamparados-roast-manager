import { z } from "zod";

export const TABLAS_SYNC = [
  "trazabilidad_temperatura",
  "hitos_termicos",
  "ajustes_tueste",
  "metricas_tueste",
  "servicios_ejecutados",
] as const;

export type TablaSync = (typeof TABLAS_SYNC)[number];

export const BATCH_MAX = 500;

const idPerfilSchema = z.number().int().positive();

export const temperaturaSyncSchema = z.object({
  id_perfil: idPerfilSchema,
  minuto: z.number().min(0).max(24 * 60),
  temperatura_registrada: z.number().min(70).max(220),
});

export const TIPOS_HITO = [
  "Turning Point",
  "Amarillo",
  "Marrón",
  "Crack Inicial",
  "Crack Final",
  "Segundo Crack",
  "Final",
  "Tiempo Enfriamiento",
] as const;

export const hitoSyncSchema = z.object({
  id_perfil: idPerfilSchema,
  tipo_hito: z.enum(TIPOS_HITO),
  tiempo_min: z.number().min(0).max(24 * 60).nullable(),
  temperatura: z.number().min(70).max(220).nullable(),
});

export const ajusteSyncSchema = z.object({
  id_perfil: idPerfilSchema,
  orden_secuencia: z.number().int().min(0).max(1000),
  temperatura_ajuste: z.number().min(0).max(400).nullable().optional(),
  llama: z.string().max(50).nullable().optional(),
  tiempo: z.number().min(0).max(24 * 60).nullable().optional(),
  aire: z.string().max(50).nullable().optional(),
});

export const metricaSyncSchema = z.object({
  id_perfil: idPerfilSchema,
  tipo_metrica: z.enum(["Peso", "Humedad", "Densidad"]),
  valor_antes: z.number().min(0).nullable(),
  valor_despues: z.number().min(0).nullable(),
});

export const servicioEjecutadoSyncSchema = z.object({
  id_orden: z.number().int().positive(),
  tipo_servicio: z.string().min(1).max(100),
  servicio_id: z.number().int().positive().nullable().optional(),
  empaque_id: z.number().int().positive().nullable().optional(),
  peso_inicial: z.number().min(0).nullable().optional(),
  peso_kg: z.number().min(0).nullable().optional(),
  precio: z.number().min(0).nullable().optional(),
  id_operador: z.number().int().positive().nullable().optional(),
});

export const syncDataSchemas = {
  trazabilidad_temperatura: temperaturaSyncSchema,
  hitos_termicos: hitoSyncSchema,
  ajustes_tueste: ajusteSyncSchema,
  metricas_tueste: metricaSyncSchema,
  servicios_ejecutados: servicioEjecutadoSyncSchema,
} satisfies Record<TablaSync, z.ZodTypeAny>;

export const syncItemSchema = z.object({
  tempId: z.string().min(1).max(100),
  table: z.enum(TABLAS_SYNC),
  data: z.unknown(),
});

export type SyncItem = z.infer<typeof syncItemSchema>;

export const syncBatchSchema = z.object({
  items: z.array(syncItemSchema).min(1).max(BATCH_MAX),
});
