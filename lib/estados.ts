export interface DefinicionEstado {
  label: string;
  className: string;
}

export type MapaEstados = Record<string, DefinicionEstado>;

export type FamiliaEstados = "orden" | "lote" | "paso" | "estado_lote";

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
  Calificado: { label: "Calificado", className: "bg-teal-100 text-teal-800" },
  Vendido: { label: "Vendido", className: "bg-green-100 text-green-800" },
};

export const ESTADOS_LOTE_COMERCIAL: MapaEstados = {
  proceso: { label: "En proceso", className: "bg-amber-100 text-amber-800" },
  disponible: { label: "Disponible", className: "bg-blue-100 text-blue-800" },
  vendido: { label: "Vendido", className: "bg-green-100 text-green-800" },
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
  estado_lote: ESTADOS_LOTE_COMERCIAL,
};

export function resolverEstado(
  estado: string | null | undefined,
  familia: FamiliaEstados = "orden"
): DefinicionEstado {
  if (!estado) return NEUTRO;
  return MAPAS[familia][estado] ?? { label: estado, className: NEUTRO.className };
}
