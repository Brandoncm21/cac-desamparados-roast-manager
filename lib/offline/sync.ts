import { createClient } from "@/lib/supabase/client";
import { getSyncQueue, removeFromSyncQueue, markTemperaturaSynced, markHitoSynced, incrementSyncQueueRetry } from "./db";

const MAX_RETRIES = 3;

export async function syncAll() {
  const supabase = createClient();
  const queue = await getSyncQueue();

  if (queue.length === 0) return { synced: 0, failed: 0, dropped: 0 };

  let synced = 0;
  let failed = 0;
  let dropped = 0;

  for (const item of queue) {
    try {
      const d = item.data as Record<string, unknown>;
      let error: Error | null = null;

      if (item.table === "trazabilidad_temperatura") {
        const { synced: _syncedT, id_registro: _idReg, ...dbData } = d;
        const result = await supabase
          .from("trazabilidad_temperatura")
          .upsert(dbData, { onConflict: "id_perfil, minuto" });
        error = result.error;
        if (!error) {
          await markTemperaturaSynced(d["id_perfil"] as number, d["minuto"] as number);
        }
      } else if (item.table === "hitos_termicos") {
        const { synced: _syncedH, id_hito: _idHito, ...dbData } = d;
        const result = await supabase
          .from("hitos_termicos")
          .upsert(dbData, { onConflict: "id_perfil, tipo_hito" });
        error = result.error;
        if (!error) {
          await markHitoSynced(d["id_perfil"] as number, d["tipo_hito"] as string);
        }
      } else {
        console.warn("syncAll: tabla desconocida", item.table);
        await removeFromSyncQueue(item.id as number);
        dropped++;
        continue;
      }

      if (error) {
        const errorDetails = {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          item: { table: item.table, data: d },
        };
        console.error("syncAll error:", errorDetails);
        const retries = (item.retries || 0) + 1;
        if (retries >= MAX_RETRIES) {
          console.warn(`syncAll: descartando item ${item.id} después de ${MAX_RETRIES} intentos`);
          await removeFromSyncQueue(item.id as number);
          dropped++;
        } else {
          await incrementSyncQueueRetry(item.id as number, error.message);
          failed++;
        }
        continue;
      }

      await removeFromSyncQueue(item.id as number);
      synced++;
    } catch (e) {
      console.error("syncAll exception:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      const retries = (item.retries || 0) + 1;
      if (retries >= MAX_RETRIES) {
        console.warn(`syncAll: descartando item ${item.id} después de ${MAX_RETRIES} intentos`);
        await removeFromSyncQueue(item.id as number);
        dropped++;
      } else {
        await incrementSyncQueueRetry(item.id as number, errorMessage);
        failed++;
      }
    }
  }

  return { synced, failed, dropped };
}

export function getSyncStatus() {
  if (typeof navigator === "undefined") return "offline";
  return navigator.onLine ? "online" : "offline";
}
