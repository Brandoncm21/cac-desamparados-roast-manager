import { z } from "zod";

export const crearServicioMaestroSchema = z.object({
  codigo: z.string().min(1, "El código es obligatorio").max(30),
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  descripcion: z.string().optional().nullable().or(z.literal("")),
  default_peso_kg: z.number().positive().optional().nullable(),
  activo: z.boolean().optional(),
});

export const actualizarServicioMaestroSchema = z.object({
  codigo: z.string().min(1).max(30).optional(),
  nombre: z.string().min(1).max(150).optional(),
  descripcion: z.string().optional().nullable().or(z.literal("")),
  default_peso_kg: z.number().positive().optional().nullable(),
  activo: z.boolean().optional(),
});

export const crearPrecioServicioSchema = z.object({
  precio_por_kg: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

export const crearEmpaqueSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  unit_weight_kg: z.number().positive().optional().nullable(),
  activo: z.boolean().optional(),
});

export const actualizarEmpaqueSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  unit_weight_kg: z.number().positive().optional().nullable(),
  activo: z.boolean().optional(),
});

export const crearPrecioEmpaqueSchema = z.object({
  precio: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

export type CrearServicioMaestroInput = z.infer<typeof crearServicioMaestroSchema>;
export type ActualizarServicioMaestroInput = z.infer<typeof actualizarServicioMaestroSchema>;
export type CrearPrecioServicioInput = z.infer<typeof crearPrecioServicioSchema>;
export type CrearEmpaqueInput = z.infer<typeof crearEmpaqueSchema>;
export type ActualizarEmpaqueInput = z.infer<typeof actualizarEmpaqueSchema>;
export type CrearPrecioEmpaqueInput = z.infer<typeof crearPrecioEmpaqueSchema>;
