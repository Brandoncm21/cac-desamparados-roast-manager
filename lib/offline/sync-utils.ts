export const BATCH_SIZE = 200;
export const MAX_RETRIES = 3;
export const BACKOFF_BASE_MS = 5000;
export const BACKOFF_MAX_MS = 5 * 60 * 1000;

export function backoffMs(retries: number): number {
  const exp = Math.min(Math.max(retries, 0), 6);
  return Math.min(BACKOFF_BASE_MS * 2 ** exp, BACKOFF_MAX_MS);
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export interface ItemConTabla {
  table: string;
  tempId: string;
  data: Record<string, unknown>;
}

export function claveNatural(table: string, data: Record<string, unknown>): string | null {
  switch (table) {
    case "trazabilidad_temperatura":
      return `${data["id_perfil"]}:${data["minuto"]}`;
    case "hitos_termicos":
      return `${data["id_perfil"]}:${data["tipo_hito"]}`;
    case "ajustes_tueste":
      return `${data["id_perfil"]}:${data["orden_secuencia"]}`;
    case "metricas_tueste":
      return `${data["id_perfil"]}:${data["tipo_metrica"]}`;
    default:
      return null;
  }
}

/**
 * Elimina duplicados dentro de un batch conservando el último por clave
 * natural (last-write-wins). Tablas sin clave natural se conservan todas.
 */
export function dedupePorClave<T extends ItemConTabla>(items: T[]): T[] {
  const vistos = new Map<string, T>();
  const sinClave: T[] = [];
  for (const item of items) {
    const clave = claveNatural(item.table, item.data);
    if (clave === null) {
      sinClave.push(item);
      continue;
    }
    vistos.set(`${item.table}:${clave}`, item);
  }
  return [...vistos.values(), ...sinClave];
}

export function agruparPorTabla<T extends ItemConTabla>(
  items: T[]
): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const lista = grupos.get(item.table) ?? [];
    lista.push(item);
    grupos.set(item.table, lista);
  }
  return grupos;
}
