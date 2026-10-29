import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addToSyncQueue,
  getDeadLetter,
  getSyncQueue,
  getTemperaturasLocal,
  incrementSyncQueueRetry,
  markTemperaturaSynced,
  moveToDeadLetter,
  removeFromDeadLetter,
  removeFromSyncQueue,
  requeueDeadLetter,
  saveTemperaturaLocal,
} from "@/lib/offline/db";

function primero<T>(arr: T[]): T {
  const v = arr[0];
  if (v === undefined) throw new Error("se esperaba un elemento");
  return v;
}

function segundo<T>(arr: T[]): T {
  const v = arr[1];
  if (v === undefined) throw new Error("se esperaban dos elementos");
  return v;
}

async function limpiarTodo() {
  for (const item of await getSyncQueue()) {
    if (item.id !== undefined) await removeFromSyncQueue(item.id);
  }
  for (const item of await getDeadLetter()) {
    if (item.id !== undefined) await removeFromDeadLetter(item.id);
  }
}

beforeEach(async () => {
  await limpiarTodo();
});

describe("cola de sincronización", () => {
  it("addToSyncQueue genera tempId único y valores iniciales", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 3, temperatura_registrada: 195 },
      id_perfil: 1,
    });
    await addToSyncQueue({
      table: "hitos_termicos",
      data: { id_perfil: 1, tipo_hito: "Final", tiempo_min: 12, temperatura: 200 },
      id_perfil: 1,
    });
    const cola = await getSyncQueue();
    expect(cola).toHaveLength(2);
    expect(primero(cola).tempId).toBeTruthy();
    expect(primero(cola).tempId).not.toBe(segundo(cola).tempId);
    expect(primero(cola).retries).toBe(0);
  });

  it("incrementSyncQueueRetry suma reintento y programa backoff", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 1, temperatura_registrada: 180 },
      id_perfil: 1,
    });
    const item = primero(await getSyncQueue());
    const antes = Date.now();
    await incrementSyncQueueRetry(item.id as number, "boom", 10_000);
    const actual = primero(await getSyncQueue());
    expect(actual.retries).toBe(1);
    expect(actual.last_error).toBe("boom");
    expect(actual.next_attempt_at ?? 0).toBeGreaterThanOrEqual(antes + 10_000);
  });

  it("markTemperaturaSynced marca el flag local", async () => {
    await saveTemperaturaLocal({
      id_perfil: 1,
      minuto: 5,
      temperatura_registrada: 190,
      synced: false,
    });
    await markTemperaturaSynced(1, 5);
    const locales = await getTemperaturasLocal(1);
    expect(primero(locales).synced).toBe(true);
  });
});

describe("dead-letter queue", () => {
  it("moveToDeadLetter traslada el item con su error", async () => {
    await addToSyncQueue({
      table: "hitos_termicos",
      data: { id_perfil: 2, tipo_hito: "Final", tiempo_min: 10, temperatura: 201 },
      id_perfil: 2,
    });
    const item = primero(await getSyncQueue());
    await moveToDeadLetter({ ...item, retries: 3 }, "23503 fk");
    expect(await getSyncQueue()).toHaveLength(0);
    const dlq = await getDeadLetter();
    expect(dlq).toHaveLength(1);
    expect(primero(dlq).last_error).toBe("23503 fk");
    expect(primero(dlq).retries).toBe(3);
    expect(primero(dlq).tempId).toBe(item.tempId);
  });

  it("requeueDeadLetter devuelve el item a la cola con retries en cero", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 3, minuto: 2, temperatura_registrada: 185 },
      id_perfil: 3,
    });
    const item = primero(await getSyncQueue());
    await moveToDeadLetter({ ...item, retries: 3 }, "500");
    const dlqItem = primero(await getDeadLetter());
    expect(await requeueDeadLetter(dlqItem.id as number)).toBe(true);
    expect(await getDeadLetter()).toHaveLength(0);
    const cola = await getSyncQueue();
    expect(cola).toHaveLength(1);
    expect(primero(cola).retries).toBe(0);
  });

  it("removeFromDeadLetter descarta definitivamente", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 4, minuto: 1, temperatura_registrada: 180 },
      id_perfil: 4,
    });
    const item = primero(await getSyncQueue());
    await moveToDeadLetter(item, "500");
    const dlqItem = primero(await getDeadLetter());
    await removeFromDeadLetter(dlqItem.id as number);
    expect(await getDeadLetter()).toHaveLength(0);
    expect(await getSyncQueue()).toHaveLength(0);
  });

  it("cola y DLQ son independientes", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 5, minuto: 1, temperatura_registrada: 180 },
      id_perfil: 5,
    });
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 5, minuto: 2, temperatura_registrada: 181 },
      id_perfil: 5,
    });
    const colaInicial = await getSyncQueue();
    await moveToDeadLetter(segundo(colaInicial), "500");
    expect(await getSyncQueue()).toHaveLength(1);
    expect(await getDeadLetter()).toHaveLength(1);
  });
});
