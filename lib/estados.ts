/**
 * Fuente única de estados de dominio y su presentación.
 *
 * Antes cada página definía su propio `estadoBadge` con un mapa de colores
 * duplicado. Las clases se conservan tal cual estaban para no cambiar la UI.
 */

export interface DefinicionEstado {
  /** Texto visible (los estados de paso vienen en MAYÚSCULAS y se muestran legibles). */
  label: string;
  /** Clases Tailwind del badge. */
  className: string;
}

export type MapaEstados = Record<string, DefinicionEstado>;

export type FamiliaEstados = "orden" | "lote" | "paso";

/** Estado desconocido o vacío: gris y sin inventar etiqueta. */
export const NEUTRO: DefinicionEstado = {
  label: "",
  className: "bg-gray-100 text-gray-800",
};

export const ESTADOS_ORDEN: MapaEstados = {
  Pendiente: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
  "En Proceso": { label: "En Proceso", className: "bg-blue-100 text-blue-800" },
  Completado: { label: "Completado", className: "bg-green-100 text-green-800" },
  Cancelado: { label: "Cancelado", className: "bg-red-100 text-red-800" },
};

export const ESTADOS_LOTE: MapaEstados = {
  Recibido: { label: "Recibido", className: "bg-gray-100 text-gray-800" },
  "En Caracterización": { label: "En Caracterización", className: "bg-amber-100 text-amber-800" },
  "En Secado": { label: "En Secado", className: "bg-amber-100 text-amber-800" },
  "En Trilla": { label: "En Trilla", className: "bg-blue-100 text-blue-800" },
  "En Bodega": { label: "En Bodega", className: "bg-purple-100 text-purple-800" },
  Catado: { label: "Catado", className: "bg-orange-100 text-orange-800" },
  Vendido: { label: "Vendido", className: "bg-green-100 text-green-800" },
};

export const ESTADOS_PASO: MapaEstados = {
  PENDIENTE: { label: "Pendiente", className: "bg-gray-100 text-gray-600" },
  EN_PROCESO: { label: "En proceso", className: "bg-blue-100 text-blue-800" },
  COMPLETADO: { label: "Completado", className: "bg-green-100 text-green-800" },
  OMITIDO: { label: "Omitido", className: "bg-orange-100 text-orange-800" },
};

const MAPAS: Record<FamiliaEstados, MapaEstados> = {
  orden: ESTADOS_ORDEN,
  lote: ESTADOS_LOTE,
  paso: ESTADOS_PASO,
};

/**
 * Devuelve la definición de presentación de un estado.
 *
 * Un estado vacío o ausente devuelve `NEUTRO`; un estado no registrado conserva
 * su texto crudo con el color neutro.
 */
export function resolverEstado(
  estado: string | null | undefined,
  familia: FamiliaEstados = "orden"
): DefinicionEstado {
  if (!estado) return NEUTRO;
  return MAPAS[familia][estado] ?? { label: estado, className: NEUTRO.className };
}
