import { createClient } from "@/lib/supabase/client";
import { getSyncQueue, removeFromSyncQueue, markTemperaturaSynced, markHitoSynced } from "./db";

export async function syncAll() {
  const supabase = createClient();
  const queue = await getSyncQueue();

  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const d = item.data as Record<string, unknown>;
      if (item.table === "trazabilidad_temperatura") {
        const { error } = await supabase
          .from("trazabilidad_temperatura")
          .upsert(d, { onConflict: "id_perfil, minuto" });

        if (error) { failed++; continue; }
        await markTemperaturaSynced(d.id_perfil as number, d.minuto as number);
      } else if (item.table === "hitos_termicos") {
        const { error } = await supabase
          .from("hitos_termicos")
          .upsert(d, { onConflict: "id_perfil, tipo_hito" });

        if (error) { failed++; continue; }
        await markHitoSynced(d.id_perfil as number, d.tipo_hito as string);
      }

      await removeFromSyncQueue(item.id as number);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export function getSyncStatus() {
  if (typeof navigator === "undefined") return "offline";
  return navigator.onLine ? "online" : "offline";
}
