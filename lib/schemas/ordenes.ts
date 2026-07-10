import { z } from "zod";

export const crearOrdenSchema = z.object({
  id_cliente: z.number().int().positive("Seleccione un cliente"),
  zona_finca: z.string().max(150).optional().or(z.literal("")),
  porcentaje_humedad_entrada: z.number().min(0).max(100).optional().nullable(),
  proceso_cafe: z.enum(["Lavado", "Honey", "Natural", "Otro", ""]).optional().nullable(),
  descripcion_producto: z.string().optional().or(z.literal("")),
  id_empleado_recibe: z.number().int().positive("Seleccione un responsable"),
  id_empleado_entrega: z.number().int().positive().optional().nullable(),
  fecha_orden: z.string().optional(),
  hora_cierre: z.string().optional().or(z.literal("")),
  firma_aprobacion_cliente: z.boolean().optional().default(false),
  fecha_aprobacion: z.string().optional().nullable(),
  servicios: z.array(z.object({
    tipo_servicio: z.enum([
      "Chancado", "Trillado", "Clasificación Mecánica", "Clasificación Manual",
      "Tueste", "Molido", "Empacado"
    ]),
    peso_inicial: z.number().positive().optional().nullable(),
    precio: z.number().min(0).optional().nullable(),
  })).min(1, "Agregue al menos un servicio"),
  tipo_tueste: z.string().max(100).optional().or(z.literal("")),
  tipo_molienda: z.string().max(100).optional().or(z.literal("")),
  tipo_empaque: z.string().max(100).optional().or(z.literal("")),
  observaciones: z.string().optional().or(z.literal("")),
});

export const cambiarEstadoOrdenSchema = z.object({
  estado_orden: z.enum(["Pendiente", "En Proceso", "Completado", "Cancelado"]),
});

export const actualizarOrdenSchema = z.object({
  zona_finca: z.string().max(150).optional().nullable().or(z.literal("")),
  porcentaje_humedad_entrada: z.number().min(0).max(100).optional().nullable(),
  proceso_cafe: z.enum(["Lavado", "Honey", "Natural", "Otro", ""]).optional().nullable(),
  descripcion_producto: z.string().optional().nullable().or(z.literal("")),
  id_empleado_recibe: z.number().int().positive().optional().nullable(),
  id_empleado_entrega: z.number().int().positive().optional().nullable(),
  fecha_orden: z.string().optional().nullable(),
  hora_cierre: z.string().optional().nullable().or(z.literal("")),
  firma_aprobacion_cliente: z.boolean().optional().nullable(),
  fecha_aprobacion: z.string().optional().nullable(),
  estado_orden: z.enum(["Pendiente", "En Proceso", "Completado", "Cancelado"]).optional(),
});

export type CrearOrdenInput = z.infer<typeof crearOrdenSchema>;
export type CambiarEstadoOrdenInput = z.infer<typeof cambiarEstadoOrdenSchema>;
export type ActualizarOrdenInput = z.infer<typeof actualizarOrdenSchema>;
