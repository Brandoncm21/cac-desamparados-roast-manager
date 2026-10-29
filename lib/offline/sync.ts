import {
  getDeadLetter,
  getSyncQueue,
  incrementSyncQueueRetry,
  markHitoSynced,
  markTemperaturaSynced,
  moveToDeadLetter,
  removeFromDeadLetter,
  removeFromSyncQueue,
  requeueDeadLetter,
  type SyncQueueItem,
} from "./db";
import { BATCH_SIZE, MAX_RETRIES, backoffMs, chunk } from "./sync-utils";

export interface SyncResult {
  synced: number;
  failed: number;
  deadLettered: number;
  pending: number;
}

interface RespuestaSync {
  data?: {
    accepted?: { tempId: string; recordId: number | null }[];
    rejected?: { tempId: string; code: string; message: string }[];
  };
  error?: { message?: string };
}

let vuelo: Promise<SyncResult> | null = null;

export async function syncAll(): Promise<SyncResult> {
  if (vuelo) return vuelo;
  vuelo = ejecutarSync()
    .catch(() => ({ synced: 0, failed: 0, deadLettered: 0, pending: 0 }))
    .finally(() => {
      vuelo = null;
    });
  return vuelo;
}

function itemParaServidor(item: SyncQueueItem) {
  const d = item.data as Record<string, unknown>;
  if (item.table === "trazabilidad_temperatura") {
    return {
      tempId: item.tempId,
      table: item.table,
      data: {
        id_perfil: item.id_perfil,
        minuto: d["minuto"],
        temperatura_registrada: d["temperatura_registrada"],
      },
    };
  }
  if (item.table === "hitos_termicos") {
    return {
      tempId: item.tempId,
      table: item.table,
      data: {
        id_perfil: item.id_perfil,
        tipo_hito: d["tipo_hito"],
        tiempo_min: d["tiempo_min"] ?? null,
        temperatura: d["temperatura"] ?? null,
      },
    };
  }
  return { tempId: item.tempId, table: item.table, data: d };
}

async function marcarSincronizadoLocal(item: SyncQueueItem) {
  if (item.table === "trazabilidad_temperatura") {
    await markTemperaturaSynced(
      item.id_perfil,
      (item.data as Record<string, unknown>)["minuto"] as number
    );
  } else if (item.table === "hitos_termicos") {
    await markHitoSynced(
      item.id_perfil,
      (item.data as Record<string, unknown>)["tipo_hito"] as string
    );
  }
}

async function registrarFallo(
  item: SyncQueueItem,
  mensaje: string,
  contadores: { failed: number; deadLettered: number }
) {
  const reintentos = (item.retries || 0) + 1;
  if (item.id === undefined) return;
  if (reintentos >= MAX_RETRIES) {
    await moveToDeadLetter({ ...item, retries: reintentos }, mensaje);
    contadores.deadLettered += 1;
  } else {
    await incrementSyncQueueRetry(
      item.id,
      mensaje,
      backoffMs(reintentos)
    );
    contadores.failed += 1;
  }
}

async function ejecutarSync(): Promise<SyncResult> {
  const cola = await getSyncQueue();
  const ahora = Date.now();
  const debidos = cola.filter(
    (item) => !item.next_attempt_at || item.next_attempt_at <= ahora
  );
  const pendientes = cola.length - debidos.length;

  const resultado: SyncResult = {
    synced: 0,
    failed: 0,
    deadLettered: 0,
    pending: pendientes,
  };
  if (debidos.length === 0) return resultado;

  for (const lote of chunk(debidos, BATCH_SIZE)) {
    let respuesta: RespuestaSync | null = null;
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lote.map(itemParaServidor) }),
      });
      respuesta = (await res.json()) as RespuestaSync;
      if (!res.ok) {
        throw new Error(
          respuesta?.error?.message || `Error HTTP ${res.status}`
        );
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      for (const item of lote) {
        await registrarFallo(item, mensaje, resultado);
      }
      continue;
    }

    const aceptados = new Map(
      (respuesta?.data?.accepted ?? []).map((a) => [a.tempId, a.recordId])
    );
    const rechazados = new Map(
      (respuesta?.data?.rejected ?? []).map((r) => [r.tempId, r.message])
    );

    for (const item of lote) {
      if (item.id === undefined) continue;
      if (aceptados.has(item.tempId)) {
        await marcarSincronizadoLocal(item);
        await removeFromSyncQueue(item.id);
        resultado.synced += 1;
      } else {
        await registrarFallo(
          item,
          rechazados.get(item.tempId) ?? "Rechazado por el servidor",
          resultado
        );
      }
    }
  }

  return resultado;
}

export function getSyncStatus() {
  if (typeof navigator === "undefined") return "offline";
  return navigator.onLine ? "online" : "offline";
}

export async function getDeadLetterCount(): Promise<number> {
  const items = await getDeadLetter();
  return items.length;
}

export async function reintentarDeadLetter(): Promise<number> {
  const items = await getDeadLetter();
  let reencolados = 0;
  for (const item of items) {
    if (item.id !== undefined && (await requeueDeadLetter(item.id))) {
      reencolados += 1;
    }
  }
  if (reencolados > 0) await syncAll();
  return reencolados;
}

export async function descartarDeadLetter(id: number) {
  await removeFromDeadLetter(id);
}
