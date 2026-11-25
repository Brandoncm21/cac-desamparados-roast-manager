/**
 * Acceso a `/api/recibido/**` y catálogos del flujo Beneficiado / Acopio.
 *
 * Escrituras delgadas: la lógica vive en las RPCs transaccionales del servidor.
 * Los errores llegan normalizados por `leerJson`/`leerJsonPaginado` (ApiError).
 */

import type {
  ActualizarRecibidoInput,
  BodegajeInput,
  CalificacionInput,
  CaracterizacionInput,
  CatacionInput,
  CrearRecibidoInput,
  SecadoInput,
  TrillaInput,
} from "@/lib/schemas/beneficio";
import type { CrearProductorInput } from "@/lib/schemas/productores";
import { leerJson, leerJsonPaginado } from "./http";

export interface ZonaFinca {
  nombre: string;
}

export interface FincaResumen {
  id_finca: number;
  nombre: string;
  altura: number | null;
  productor_id: number;
  zonas_finca: ZonaFinca | null;
}

export interface ProductorResumen {
  id_productor: number;
  nombre_completo: string;
  telefono: string | null;
}

export interface RecibidoLote {
  id_lote: number;
  public_id: string;
  numero_lote: string;
  numero_recibo: string;
  factura: string | null;
  productor_id: number;
  finca_id: number;
  productores: { nombre_completo: string } | null;
  fincas: FincaResumen | null;
  varietal: string | null;
  cajuelas: number | null;
  cuartillos: number | null;
  porcentaje_flote: number | null;
  porcentaje_broca: number | null;
  porcentaje_vano: number | null;
  porcentaje_verde: number | null;
  porcentaje_secos: number | null;
  porcentaje_segundas: number | null;
  porcentaje_danos_mecanicos: number | null;
  porcentaje_pulpa_pergamino: number | null;
  porcentaje_pergamino_pulpa: number | null;
  densidad_fruta: number | null;
  densidad_pergamino_humedo: number | null;
  porcentaje_puro: number | null;
  porcentaje_impuro: number | null;
  porcentaje_limpio: number | null;
  porcentaje_sucio: number | null;
  zona_finca: string | null;
  altura_finca: number | null;
  proceso: string | null;
  proceso_otro: string | null;
  estado_lote: "proceso" | "disponible" | "vendido";
  enproceso: string;
  disponible: boolean;
  vendido: boolean;
  fecha_recibido: string;
}

export type EtapaFila = Record<string, unknown> & { id_lote?: number };

export interface RecibidoDetalle extends RecibidoLote {
  etapas: Partial<Record<EtapaBeneficioNombre, EtapaFila | null>>;
}

export type EtapaBeneficioNombre =
  | "caracterizacion"
  | "secado"
  | "bodegaje"
  | "trilla"
  | "catacion"
  | "calificacion";

export interface ListarRecibidosParams {
  page?: number;
  pageSize?: number;
  enproceso?: string;
  estado_lote?: string;
  search?: string;
  productor_id?: number;
  finca_id?: number;
  desde?: string;
  hasta?: string;
}

export async function listarProductores(search?: string): Promise<ProductorResumen[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (search?.trim()) params.set("search", search.trim());

  const res = await fetch(`/api/productores?${params}`);
  const { items } = await leerJsonPaginado<ProductorResumen>(res);
  return items;
}

/**
 * Crea un productor. Solo viajan las columnas editables (`nombre_completo`,
 * `telefono`); fechas, `public_id` y `id_productor` los asigna la BD.
 */
export async function crearProductor(
  input: CrearProductorInput
): Promise<ProductorResumen> {
  const res = await fetch("/api/productores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<ProductorResumen>(res);
}

export async function listarFincasDeProductor(
  productorId: number
): Promise<FincaResumen[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "100",
    productor_id: String(productorId),
  });

  const res = await fetch(`/api/fincas?${params}`);
  const { items } = await leerJsonPaginado<FincaResumen>(res);
  return items;
}

export async function listarRecibidos(params: ListarRecibidosParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 25),
  });
  if (params.enproceso) query.set("enproceso", params.enproceso);
  if (params.estado_lote) query.set("estado_lote", params.estado_lote);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.productor_id) query.set("productor_id", String(params.productor_id));
  if (params.finca_id) query.set("finca_id", String(params.finca_id));
  if (params.desde) query.set("desde", params.desde);
  if (params.hasta) query.set("hasta", params.hasta);

  const res = await fetch(`/api/recibido?${query}`);
  return leerJsonPaginado<RecibidoLote>(res);
}

export async function crearRecibido(
  input: CrearRecibidoInput
): Promise<RecibidoLote> {
  const res = await fetch("/api/recibido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<RecibidoLote>(res);
}

export async function obtenerRecibido(id: number): Promise<RecibidoDetalle> {
  const res = await fetch(`/api/recibido/${id}`);
  return leerJson<RecibidoDetalle>(res);
}

export async function actualizarRecibido(
  id: number,
  input: ActualizarRecibidoInput
): Promise<RecibidoLote> {
  const res = await fetch(`/api/recibido/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<RecibidoLote>(res);
}

export async function actualizarEstadoRecibido(
  id: number,
  estado_lote: "proceso" | "disponible" | "vendido"
): Promise<RecibidoLote> {
  return actualizarRecibido(id, { estado_lote });
}

export async function desactivarRecibido(id: number): Promise<void> {
  const res = await fetch(`/api/recibido/${id}`, { method: "DELETE" });
  await leerJson<{ deleted: boolean }>(res);
}

export type CuerpoEtapa =
  | CaracterizacionInput
  | SecadoInput
  | BodegajeInput
  | TrillaInput
  | CatacionInput
  | CalificacionInput;

/** Lo que devuelven las RPCs: la fila guardada y el estado resultante del lote. */
export interface ResultadoEtapa {
  enproceso: string;
  caracterizacion?: EtapaFila;
  secado?: EtapaFila;
  bodega?: EtapaFila;
  trilla?: EtapaFila;
  catacion?: EtapaFila;
  calificacion?: EtapaFila;
}

export async function obtenerEtapa(
  id: number,
  etapa: EtapaBeneficioNombre
): Promise<EtapaFila | null> {
  const res = await fetch(`/api/recibido/${id}/${etapa}`);
  return leerJson<EtapaFila | null>(res);
}

export async function guardarEtapa(
  id: number,
  etapa: EtapaBeneficioNombre,
  body: CuerpoEtapa
): Promise<ResultadoEtapa> {
  const res = await fetch(`/api/recibido/${id}/${etapa}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return leerJson<ResultadoEtapa>(res);
}
