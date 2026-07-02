import { z } from "zod";

export const crearClienteSchema = z.object({
  nombre_completo: z.string().min(1, "El nombre es obligatorio").max(200),
  telefono: z.string().max(30).optional().or(z.literal("")),
  zona_procedencia: z.string().max(150).optional().or(z.literal("")),
});

export const actualizarClienteSchema = crearClienteSchema.partial();

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
