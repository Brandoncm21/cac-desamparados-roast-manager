import { z } from "zod";

// Inicio de cualquier paso: siempre se captura el peso operativo de entrada.
// Para chancado/trillado es el peso de cobro; para tueste el café verde;
// para empacado es el peso base del café disponible a empaquetar.
export const iniciarPasoSchema = z.object({
  peso_inicial_kg: z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
    z.number().positive("El peso inicial debe ser mayor a 0")
  ),
});

// Cierre de pasos generales (chancado, trillado, molido, clasificación):
// el cobro ya quedó definido con el peso_inicial; peso_final es opcional
// (solo para trazabilidad de merma) y no bloquea el flujo.
export const cerrarGeneralSchema = z.object({
  peso_final_kg: z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
    z.number().positive("El peso final debe ser mayor a 0").optional().nullable()
  ),
  observaciones: z.string().optional().nullable().or(z.literal("")),
});

// Cierre de empacado: se requiere el empaque y el peso base ya fue capturado
// en el inicio del paso (peso_facturable_kg). No se pide peso_final.
export const cerrarEmpacadoSchema = z.object({
  empaque_id: z.number().int().positive("Debe seleccionar un empaque"),
  observaciones: z.string().optional().nullable().or(z.literal("")),
});

// Confirmación manual del tueste: requiere peso_final para calcular merma.
export const confirmarTuesteSchema = z.object({
  peso_final_kg: z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
    z.number().positive("El peso final debe ser mayor a 0")
  ),
  observaciones: z.string().optional().nullable().or(z.literal("")),
});

export type IniciarPasoInput = z.infer<typeof iniciarPasoSchema>;
export type CerrarGeneralInput = z.infer<typeof cerrarGeneralSchema>;
export type CerrarEmpacadoInput = z.infer<typeof cerrarEmpacadoSchema>;
export type ConfirmarTuesteInput = z.infer<typeof confirmarTuesteSchema>;
