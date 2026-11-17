/**
 * Acceso a `/api/ordenes/**`.
 *
 * Las escrituras son intencionalmente delgadas: la lógica de negocio vive en las
 * RPC transaccionales del servidor (Principio II de la constitución).
 */

import type { CrearOrdenInput } from "@/lib/schemas/ordenes";
import { leerJson } from "./http";

export type EstadoPaso = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "OMITIDO";

export interface ServicioPaso {
  id_servicio_maestro: number;
  tipo: string;
  nombre: string;
}

export interface PasoOrden {
  id_paso: number;
  id_orden: number;
  servicio_id: number;
  prioridad: number;
  estado: EstadoPaso;
  peso_inicial_kg: number | null;
  peso_final_kg: number | null;
  peso_facturable_kg: number | null;
  merma_kg: number | null;
  snapshot_precio_kg: number | null;
  subtotal_servicio: number | null;
  empaque_id: number | null;
  cantidad_empaques: number | null;
  snapshot_precio_empaque: number | null;
  costo_empaques: number | null;
  costo_total_paso: number | null;
  observaciones: string | null;
  servicios_maestro: ServicioPaso;
}

export interface OrdenCreada {
  id_orden: number;
}

export async function crearOrden(input: CrearOrdenInput): Promise<OrdenCreada> {
  const res = await fetch("/api/ordenes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<OrdenCreada>(res);
}

export async function listarPasosOrden(idOrden: number): Promise<PasoOrden[]> {
  const res = await fetch(`/api/ordenes/${idOrden}/pasos`);
  return leerJson<PasoOrden[]>(res);
}

export async function cambiarEstadoOrden(
  idOrden: number,
  estado: string
): Promise<{ id_orden: number; estado_orden: string }> {
  const res = await fetch(`/api/ordenes/${idOrden}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado_orden: estado }),
  });
  return leerJson<{ id_orden: number; estado_orden: string }>(res);
}

/**
 * Ejecuta una transición de un paso (`iniciar`, `cerrar`, `confirmar-tueste`).
 *
 * El cuerpo lo arma `prepararEnvioPaso()` en `lib/services/pasos-orden.ts`.
 */
export async function ejecutarAccionPaso(
  idOrden: number,
  idPaso: number,
  sufijo: string,
  body: Record<string, unknown>
): Promise<PasoOrden> {
  const res = await fetch(`/api/ordenes/${idOrden}/pasos/${idPaso}/${sufijo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return leerJson<PasoOrden>(res);
}

export async function eliminarOrden(idOrden: number): Promise<void> {
  const res = await fetch(`/api/ordenes/${idOrden}`, { method: "DELETE" });
  await leerJson<{ deleted: boolean }>(res);
}
