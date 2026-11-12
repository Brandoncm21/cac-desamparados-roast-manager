import { z } from "zod";

export const crearFincaSchema = z.object({
  cliente_id: z.number().int().positive("El cliente es obligatorio"),
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  zona_id: z.number().int().positive().nullable().optional(),
  altura: z.number().min(0, "La altura no puede ser negativa"),
});

export const actualizarFincaSchema = crearFincaSchema.partial();

export type CrearFincaInput = z.infer<typeof crearFincaSchema>;
export type ActualizarFincaInput = z.infer<typeof actualizarFincaSchema>;
