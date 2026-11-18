/**
 * Fuente única de fincas y zonas para la UI.
 *
 * La usan el alta de fincas, el flujo de recibido y los formularios que
 * necesitan el catálogo, para que todos muestren los mismos datos y etiquetas.
 */

import { leerJson } from "./api/http";

export interface ZonaOpcion {
  id_zona: number;
  nombre: string;
}

export interface FincaOpcion {
  id_finca: number;
  productor_id: number;
  nombre: string;
  altura: number | null;
  ubicacion?: string | null;
  zona_id?: number | null;
  zonas_finca?: { nombre: string } | null;
  productores?: { nombre_completo: string } | null;
}

export interface FincaInput {
  productor_id: number;
  nombre: string;
  zona_id?: number | null;
  ubicacion?: string | null;
  altura?: number | null;
}

const PAGE_SIZE = 100;

/** Fincas del productor (o todas, paginadas) con productor y zona embebidos. */
export async function listarFincas(opts?: {
  productorId?: number | null;
  search?: string;
  pageSize?: number;
}): Promise<FincaOpcion[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(opts?.pageSize ?? PAGE_SIZE),
  });
  if (opts?.productorId) params.set("productor_id", String(opts.productorId));
  if (opts?.search?.trim()) params.set("search", opts.search.trim());

  const res = await fetch(`/api/fincas?${params}`);
  return leerJson<FincaOpcion[]>(res);
}

export async function crearFinca(input: FincaInput): Promise<FincaOpcion> {
  const res = await fetch("/api/fincas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<FincaOpcion>(res);
}

export async function actualizarFinca(
  idFinca: number,
  input: Partial<FincaInput>
): Promise<FincaOpcion> {
  const res = await fetch(`/api/fincas/${idFinca}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<FincaOpcion>(res);
}

export async function obtenerFinca(idFinca: number): Promise<FincaOpcion> {
  const res = await fetch(`/api/fincas/${idFinca}`);
  return leerJson<FincaOpcion>(res);
}

export async function eliminarFinca(idFinca: number): Promise<void> {
  const res = await fetch(`/api/fincas/${idFinca}`, { method: "DELETE" });
  await leerJson<{ deleted: boolean }>(res);
}

/** Catálogo de zonas (`zonas_finca`) para el selector de zona. */
export async function listarZonas(): Promise<ZonaOpcion[]> {
  const res = await fetch("/api/zonas");
  if (!res.ok) return [];
  const data = await leerJson<ZonaOpcion[] | { zonas?: ZonaOpcion[] }>(res);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.zonas)) return data.zonas;
  return [];
}

/** Texto visible de la finca: nombre + altura + zona. */
export function etiquetaFinca(f: Pick<FincaOpcion, "nombre" | "altura" | "zonas_finca">): string {
  const partes = [f.nombre];
  if (f.altura != null) partes.push(`${f.altura} msnm`);
  if (f.zonas_finca?.nombre) partes.push(f.zonas_finca.nombre);
  return partes[0] + (partes.length > 1 ? ` — ${partes.slice(1).join(" · ")}` : "");
}

/**
 * Opciones para `<Select items={...}>` (Base UI). Pasar `items` es lo que hace que
 * el trigger muestre la etiqueta y no el `id` crudo.
 */
export function opcionesFinca(fincas: FincaOpcion[]): Array<{ value: string; label: string }> {
  return fincas.map((f) => ({ value: String(f.id_finca), label: etiquetaFinca(f) }));
}

export function opcionesProductor(
  productores: Array<{ id_productor: number; nombre_completo: string }>
): Array<{ value: string; label: string }> {
  return productores.map((p) => ({ value: String(p.id_productor), label: p.nombre_completo }));
}
