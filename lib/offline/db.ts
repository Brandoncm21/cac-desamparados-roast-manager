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

// Temperaturas
export async function saveTemperaturaLocal(record: TemperaturaRecord) {
  const db = await getDb();
  await db.put("temperaturas", record);
}

export async function getTemperaturasLocal(perfilId: number) {
  const db = await getDb();
  return db.getAllFromIndex("temperaturas", "id_perfil", perfilId);
}

export async function markTemperaturaSynced(perfilId: number, minuto: number) {
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
  const db = await getDb();
  return db.getAllFromIndex("hitos", "id_perfil", perfilId);
}

export async function markHitoSynced(perfilId: number, tipoHito: string) {
  const db = await getDb();
  const record = await db.get("hitos", [perfilId, tipoHito]);
  if (record) {
    record.synced = true;
    await db.put("hitos", record);
  }
}

// Cola de sincronización
export async function addToSyncQueue(item: { table: string; data: Record<string, unknown> | TemperaturaRecord | HitoRecord; id_perfil: number }) {
  const db = await getDb();
  await db.add("pending_sync", item);
}

export async function getSyncQueue(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.getAll("pending_sync") as Promise<Record<string, unknown>[]>;
}

export async function removeFromSyncQueue(id: number) {
  const db = await getDb();
  await db.delete("pending_sync", id);
}
