import { z } from "zod";

/**
 * Productor del flujo Beneficiado (tabla `productores`).
 *
 * Columnas editables: `nombre_completo` (obligatorio) y `telefono` (opcional).
 * El resto lo automatiza la base de datos:
 *   - `id_productor` → serial
 *   - `fecha_registro`, `created_at`, `updated_at` → default `now()`
 *   - `public_id` → default `gen_random_uuid()`
 *   - `deleted_at` → NULL (baja lógica)
 */
const TELEFONO_REGEX = /^[+()\d\s-]{7,25}$/;

export const crearProductorSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(150, "El nombre no puede superar 150 caracteres"),
  telefono: z
    .string()
    .trim()
    .max(30, "El teléfono no puede superar 30 caracteres")
    .refine(
      (valor) => valor === "" || TELEFONO_REGEX.test(valor),
      "Formato de teléfono inválido (ej: 8888-8888 o +506 8888-8888)"
    )
    .optional()
    .nullable(),
});

export type CrearProductorInput = z.infer<typeof crearProductorSchema>;
