import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "scacr-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("temperaturas")) {
          const store = db.createObjectStore("temperaturas", {
            keyPath: ["id_perfil", "minuto"],
          });
          store.createIndex("id_perfil", "id_perfil");
        }
        if (!db.objectStoreNames.contains("hitos")) {
          const store = db.createObjectStore("hitos", {
            keyPath: ["id_perfil", "tipo_hito"],
          });
          store.createIndex("id_perfil", "id_perfil");
        }
        if (!db.objectStoreNames.contains("pending_sync")) {
          const store = db.createObjectStore("pending_sync", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("id_perfil", "id_perfil");
        }
      },
    });
  }
  return dbPromise;
}

export interface TemperaturaRecord {
  id_perfil: number;
  minuto: number;
  temperatura_registrada: number;
  synced: boolean;
}

export interface HitoRecord {
  id_perfil: number;
  tipo_hito: string;
  tiempo_min: number | null;
  temperatura: number | null;
  synced: boolean;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  data: Record<string, unknown> | TemperaturaRecord | HitoRecord;
  id_perfil: number;
  retries?: number;
  last_error?: string;
  created_at?: number;
}

// Temperaturas
export async function saveTemperaturaLocal(record: TemperaturaRecord) {
  const db = await getDb();
  await db.put("temperaturas", record);
}

export async function getTemperaturasLocal(perfilId: number) {
  if (!Number.isFinite(perfilId)) return [];
  const db = await getDb();
  return db.getAllFromIndex("temperaturas", "id_perfil", perfilId);
}

export async function markTemperaturaSynced(perfilId: number, minuto: number) {
  if (!Number.isFinite(perfilId)) return;
  const db = await getDb();
  const record = await db.get("temperaturas", [perfilId, minuto]);
  if (record) {
    record.synced = true;
    await db.put("temperaturas", record);
  }
}

// Hitos
export async function saveHitoLocal(record: HitoRecord) {
  const db = await getDb();
  await db.put("hitos", record);
}

export async function getHitosLocal(perfilId: number) {
  if (!Number.isFinite(perfilId)) return [];
  const db = await getDb();
  return db.getAllFromIndex("hitos", "id_perfil", perfilId);
}

export async function markHitoSynced(perfilId: number, tipoHito: string) {
  if (!Number.isFinite(perfilId)) return;
  const db = await getDb();
  const record = await db.get("hitos", [perfilId, tipoHito]);
  if (record) {
    record.synced = true;
    await db.put("hitos", record);
  }
}

// Cola de sincronización
export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "retries" | "created_at">) {
  const db = await getDb();
  await db.add("pending_sync", {
    ...item,
    retries: 0,
    created_at: Date.now(),
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAll("pending_sync") as Promise<SyncQueueItem[]>;
}

export async function removeFromSyncQueue(id: number) {
  const db = await getDb();
  await db.delete("pending_sync", id);
}

export async function incrementSyncQueueRetry(id: number, errorMessage: string) {
  const db = await getDb();
  const item = await db.get("pending_sync", id);
  if (item) {
    item.retries = (item.retries || 0) + 1;
    item.last_error = errorMessage;
    await db.put("pending_sync", item);
  }
}
