import { z } from "zod";

export const crearPerfilSchema = z.object({
  id_orden: z.number().int().positive().optional().nullable(),
  numero_lote: z.string().max(20).optional().or(z.literal("")),
  fecha_tueste: z.string().optional(),
  id_tostador: z.number().int().positive().optional().nullable(),
  nombre_cafe: z.string().max(150).optional().or(z.literal("")),
  temperatura_sala: z.number().optional().nullable(),
  humedad_sala: z.number().optional().nullable(),
});

export const bulkTemperaturasSchema = z.object({
  temperaturas: z.array(z.object({
    minuto: z.number().int().min(0),
    temperatura_registrada: z.number().min(70).max(220),
  })).min(1),
});

export const upsertHitoSchema = z.object({
  tiempo_min: z.number().optional().nullable(),
  temperatura: z.number().optional().nullable(),
});

export type CrearPerfilInput = z.infer<typeof crearPerfilSchema>;
export type BulkTemperaturasInput = z.infer<typeof bulkTemperaturasSchema>;
export type UpsertHitoInput = z.infer<typeof upsertHitoSchema>;
