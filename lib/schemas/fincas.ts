import { z } from "zod";

/** Finca de un productor (cliente). `zona` es el catálogo `zonas_finca`; `ubicacion` es texto libre. */
export const crearFincaSchema = z.object({
  cliente_id: z.number().int().positive("El cliente es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  zona_id: z.number().int().positive().nullable().optional(),
  ubicacion: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  /** Opcional (0046): "—" cuando no se conoce la altura. */
  altura: z
    .number()
    .min(0, "La altura no puede ser negativa")
    .max(4000, "La altura máxima es 4000 msnm")
    .optional()
    .nullable(),
});

export const actualizarFincaSchema = crearFincaSchema.partial();

export type CrearFincaInput = z.infer<typeof crearFincaSchema>;
export type ActualizarFincaInput = z.infer<typeof actualizarFincaSchema>;
