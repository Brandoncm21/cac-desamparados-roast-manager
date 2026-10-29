import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToSyncQueue,
  getDeadLetter,
  getSyncQueue,
  removeFromDeadLetter,
  removeFromSyncQueue,
} from "@/lib/offline/db";
import { syncAll } from "@/lib/offline/sync";

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function respuestaSync(
  accepted: { tempId: string; recordId: number | null }[] = [],
  rejected: { tempId: string; code: string; message: string }[] = []
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: { accepted, rejected } }),
  };
}

describe("syncAll con fetch mockeado", () => {
  it("batch válido: sincroniza todo y limpia la cola", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 3, temperatura_registrada: 195 },
      id_perfil: 1,
    });
    const [item] = await getSyncQueue();
    if (!item) throw new Error("se esperaba un item en cola");
    const fetchMock = vi.fn(async (_url: string, _init?: { body?: string }) =>
      respuestaSync([{ tempId: item.tempId, recordId: 100 }], [])
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await syncAll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")
    );
    expect(body.items).toHaveLength(1);
    expect(body.items[0].tempId).toBe(item.tempId);
    expect(resultado).toEqual({
      synced: 1,
      failed: 0,
      deadLettered: 0,
      pending: 0,
    });
    expect(await getSyncQueue()).toHaveLength(0);
  });

  it("error parcial: el rechazado queda en cola con backoff", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 1, temperatura_registrada: 180 },
      id_perfil: 1,
    });
    await addToSyncQueue({
      table: "hitos_termicos",
      data: { id_perfil: 1, tipo_hito: "Final", tiempo_min: 10, temperatura: 200 },
      id_perfil: 1,
    });
    const [primero, segundo] = await getSyncQueue();
    if (!primero || !segundo) throw new Error("se esperaban dos items en cola");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuestaSync(
          [{ tempId: primero.tempId, recordId: 10 }],
          [{ tempId: segundo.tempId, code: "DB_ERROR", message: "boom" }]
        )
      )
    );

    const antes = Date.now();
    const resultado = await syncAll();
    expect(resultado.synced).toBe(1);
    expect(resultado.failed).toBe(1);
    const cola = await getSyncQueue();
    expect(cola).toHaveLength(1);
    expect(cola[0]?.tempId).toBe(segundo.tempId);
    expect(cola[0]?.retries).toBe(1);
    expect(cola[0]?.next_attempt_at ?? 0).toBeGreaterThan(antes);
  });

  it("tras agotar reintentos el item va a DLQ (no se pierde)", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 7, minuto: 1, temperatura_registrada: 180 },
      id_perfil: 7,
    });
    const [item] = await getSyncQueue();
    if (!item) throw new Error("se esperaba un item en cola");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuestaSync(
          [],
          [{ tempId: item.tempId, code: "DB_ERROR", message: "caido" }]
        )
      )
    );

    let ahora = Date.now();
    const spy = vi.spyOn(Date, "now").mockImplementation(() => ahora);

    await syncAll();
    ahora += 11_000;
    await syncAll();
    ahora += 21_000;
    const resultado = await syncAll();

    expect(resultado.deadLettered).toBe(1);
    expect(await getSyncQueue()).toHaveLength(0);
    const dlq = await getDeadLetter();
    expect(dlq).toHaveLength(1);
    expect(dlq[0]?.tempId).toBe(item.tempId);
    expect(dlq[0]?.last_error).toBe("caido");
    spy.mockRestore();
  });

  it("reproceso idempotente: segunda pasada sin pendientes no llama al servidor", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 9, temperatura_registrada: 191 },
      id_perfil: 1,
    });
    const [item] = await getSyncQueue();
    if (!item) throw new Error("se esperaba un item en cola");
    const fetchMock = vi.fn(async () =>
      respuestaSync([{ tempId: item.tempId, recordId: 5 }], [])
    );
    vi.stubGlobal("fetch", fetchMock);

    await syncAll();
    const segunda = await syncAll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(segunda).toEqual({ synced: 0, failed: 0, deadLettered: 0, pending: 0 });
  });

  it("falla de red: reintenta con backoff sin matar la cola", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 2, temperatura_registrada: 182 },
      id_perfil: 1,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );

    const resultado = await syncAll();
    expect(resultado).toEqual({
      synced: 0,
      failed: 1,
      deadLettered: 0,
      pending: 0,
    });
    const cola = await getSyncQueue();
    expect(cola).toHaveLength(1);
    expect(cola[0]?.retries).toBe(1);
  });

  it("syncAll simultáneos comparten un solo vuelo", async () => {
    await addToSyncQueue({
      table: "trazabilidad_temperatura",
      data: { id_perfil: 1, minuto: 6, temperatura_registrada: 188 },
      id_perfil: 1,
    });
    const [item] = await getSyncQueue();
    if (!item) throw new Error("se esperaba un item en cola");
    const fetchMock = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return respuestaSync([{ tempId: item.tempId, recordId: 6 }], []);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [r1, r2] = await Promise.all([syncAll(), syncAll()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1.synced).toBe(1);
    expect(r2.synced).toBe(1);
  });
});
