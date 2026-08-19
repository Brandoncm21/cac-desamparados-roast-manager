import { z } from "zod";

export const TIPOS_SERVICIO = ["general", "tueste", "empacado"] as const;

// Intervalo de precio por peso: rango [min, max), max null = sin limite
export const crearIntervaloServicioSchema = z.object({
  peso_min_kg: z.number().min(0, "El peso mínimo debe ser mayor o igual a 0"),
  peso_max_kg: z.number().positive("El peso máximo debe ser mayor a 0").optional().nullable(),
  precio_por_kg: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

function detectarTraslape(a: IntervaloServicioRaw, b: IntervaloServicioRaw): boolean {
  const aMax = a.peso_max_kg ?? Infinity;
  const bMax = b.peso_max_kg ?? Infinity;
  return (
    (a.peso_min_kg < bMax && aMax > b.peso_min_kg) ||
    (b.peso_min_kg < aMax && bMax > a.peso_min_kg)
  );
}

interface IntervaloServicioRaw {
  peso_min_kg: number;
  peso_max_kg?: number | null | undefined;
  precio_por_kg: number;
}

export const intervalosServicioSchema = z
  .array(crearIntervaloServicioSchema)
  .min(1, "Agregue al menos un intervalo de precio")
  .superRefine((intervalos, ctx) => {
    intervalos.forEach((intervalo, index) => {
      if (intervalo.peso_max_kg != null && intervalo.peso_min_kg >= intervalo.peso_max_kg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "peso_max_kg"],
          message: "El peso máximo debe ser mayor que el peso mínimo",
        });
      }
      if (intervalo.precio_por_kg <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "precio_por_kg"],
          message: "El precio por kg debe ser mayor a 0",
        });
      }
    });

    // Comparar todos los pares (incluye intervalos abiertos con max null,
    // que detectarTraslape trata como límite infinito).
    const items = intervalos.map((i, idx) => ({ i, idx }));

    for (const [aPos, itemA] of items.entries()) {
      for (const [bPos, itemB] of items.entries()) {
        if (bPos <= aPos) continue;
        if (detectarTraslape(itemA.i, itemB.i)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [itemB.idx, "peso_min_kg"],
            message: `El intervalo se solapa con el intervalo ${itemA.idx + 1}`,
          });
        }
      }
    }
  });

export const crearServicioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  descripcion: z.string().optional().nullable(),
  prioridad: z.number().int().positive("La prioridad debe ser un entero positivo"),
  tipo: z.enum(TIPOS_SERVICIO, { message: "Tipo de servicio inválido" }),
  activo: z.boolean(),
  intervalos: intervalosServicioSchema,
});

export const actualizarServicioSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  descripcion: z.string().optional().nullable(),
  prioridad: z.number().int().positive().optional(),
  tipo: z.enum(TIPOS_SERVICIO).optional(),
  activo: z.boolean().optional(),
});

// Al actualizar se envían TODOS los intervalos vigentes del servicio
export const actualizarIntervalosServicioSchema = z.object({
  intervalos: z.array(
    z.object({
      id_precio: z.number().int().positive().optional(), // presente si ya existe en BD
      peso_min_kg: z.number().min(0),
      peso_max_kg: z.number().positive().optional().nullable(),
      precio_por_kg: z.number().min(0),
    })
  ),
});

export const crearEmpaqueSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  capacidad_kg: z.number().positive().optional().nullable(),
  unit_weight_kg: z.number().positive().optional().nullable(),
  activo: z.boolean().optional(),
});

export const actualizarEmpaqueSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  capacidad_kg: z.number().positive().optional().nullable(),
  unit_weight_kg: z.number().positive().optional().nullable(),
  activo: z.boolean().optional(),
});

export const crearPrecioEmpaqueSchema = z.object({
  precio: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

export type CrearServicioInput = z.input<typeof crearServicioSchema>;
export type ActualizarServicioInput = z.input<typeof actualizarServicioSchema>;
export type IntervaloServicioInput = z.infer<typeof crearIntervaloServicioSchema>;
export type ActualizarIntervalosInput = z.infer<typeof actualizarIntervalosServicioSchema>;
export type CrearEmpaqueInput = z.input<typeof crearEmpaqueSchema>;
export type ActualizarEmpaqueInput = z.input<typeof actualizarEmpaqueSchema>;
export type CrearPrecioEmpaqueInput = z.input<typeof crearPrecioEmpaqueSchema>;

export interface IntervaloServicio {
  id_precio: number;
  id_servicio: number;
  peso_min_kg: number;
  peso_max_kg: number | null;
  precio_por_kg: number;
  activo: boolean;
}

export interface TarifaServicio {
  id_precio: number;
  id_servicio: number;
  min_weight_kg: number;
  max_weight_kg: number | null;
  precio_por_kg: number;
}
