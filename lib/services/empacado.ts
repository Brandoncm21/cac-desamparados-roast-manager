export interface EmpaqueCalculoInput {
  pesoDisponible: number;
  capacidadKg: number;
  precioUnitario: number;
}

export interface EmpaqueCalculoOutput {
  cantidad: number;
  costoEmpaques: number;
}

// Si un valor de capacidad se guardó en gramos (>= 100), se convierte a kg.
// La fuente principal del sistema es kg, esto es una red de seguridad.
export function normalizarCapacidadKg(capacidad: number | null | undefined): number | null {
  if (capacidad == null || Number.isNaN(capacidad) || capacidad <= 0) return null;
  return capacidad >= 100 ? capacidad / 1000 : capacidad;
}

export function calcularEmpaques({
  pesoDisponible,
  capacidadKg,
  precioUnitario,
}: EmpaqueCalculoInput): EmpaqueCalculoOutput {
  const capacidad = normalizarCapacidadKg(capacidadKg);
  if (!capacidad || capacidad <= 0) {
    throw new Error("La capacidad del empaque debe ser mayor a 0");
  }
  if (pesoDisponible <= 0 || Number.isNaN(pesoDisponible)) {
    return { cantidad: 0, costoEmpaques: 0 };
  }

  const cantidad = Math.ceil(pesoDisponible / capacidad);
  const costoEmpaques = cantidad * precioUnitario;

  return { cantidad, costoEmpaques };
}

export function getCurrentPrecioEmpaque(
  precios: { precio: number; valid_to: string | null }[]
): number | null {
  const vigentes = precios
    .filter((p) => !p.valid_to)
    .sort(
      (a, b) =>
        new Date((b as any).valid_from || 0).getTime() -
        new Date((a as any).valid_from || 0).getTime()
    );
  return vigentes[0]?.precio ?? null;
}
