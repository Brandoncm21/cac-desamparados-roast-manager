/**
 * Fuente única de fincas y zonas para la UI (spec 005).
 *
 * La usan el alta/edición de lotes, el alta de órdenes y el módulo de fincas,
 * para que los tres muestren exactamente los mismos datos y etiquetas.
 */

export interface ZonaOpcion {
  id_zona: number;
  nombre: string;
}

export interface FincaOpcion {
  id_finca: number;
  cliente_id: number;
  nombre: string;
  altura: number | null;
  ubicacion?: string | null;
  zona_id?: number | null;
  zonas_finca?: { nombre: string } | null;
  clientes?: { nombre_completo: string } | null;
}

export interface FincaInput {
  cliente_id: number;
  nombre: string;
  zona_id?: number | null;
  ubicacion?: string | null;
  altura?: number | null;
}

const PAGE_SIZE = 100;

async function leerJson<T>(res: Response): Promise<T> {
  const cuerpo = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(cuerpo.error?.message || `Error HTTP ${res.status}`);
  }
  return cuerpo.data as T;
}

/** Fincas del productor (o todas, paginadas) con cliente y zona embebidos. */
export async function listarFincas(opts?: {
  clienteId?: number | null;
  search?: string;
  pageSize?: number;
}): Promise<FincaOpcion[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(opts?.pageSize ?? PAGE_SIZE),
  });
  if (opts?.clienteId) params.set("cliente_id", String(opts.clienteId));
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
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(cuerpo.error?.message || "No se pudo eliminar la finca");
  }
}

/** Catálogo de zonas (`zonas_finca`) para el selector de zona. */
export async function listarZonas(): Promise<ZonaOpcion[]> {
  const res = await fetch("/api/zonas");
  if (!res.ok) return [];
  const cuerpo = (await res.json().catch(() => ({}))) as {
    data?: ZonaOpcion[] | { zonas?: ZonaOpcion[] };
  };
  const data = cuerpo.data;
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

export function opcionesCliente(
  clientes: Array<{ id_cliente: number; nombre_completo: string }>
): Array<{ value: string; label: string }> {
  return clientes.map((c) => ({ value: String(c.id_cliente), label: c.nombre_completo }));
}
