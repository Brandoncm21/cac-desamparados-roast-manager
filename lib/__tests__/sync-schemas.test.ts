import { describe, expect, it } from "vitest";
import {
  BATCH_MAX,
  ajusteSyncSchema,
  hitoSyncSchema,
  metricaSyncSchema,
  servicioEjecutadoSyncSchema,
  syncBatchSchema,
  syncItemSchema,
  temperaturaSyncSchema,
} from "../offline/schemas";

const itemBase = {
  tempId: "temp-1",
  table: "trazabilidad_temperatura" as const,
  data: { id_perfil: 1, minuto: 3, temperatura_registrada: 195 },
};

describe("syncItemSchema", () => {
  it("acepta un item válido", () => {
    expect(syncItemSchema.safeParse(itemBase).success).toBe(true);
  });

  it("rechaza tempId vacío y tabla desconocida", () => {
    expect(
      syncItemSchema.safeParse({ ...itemBase, tempId: "" }).success
    ).toBe(false);
    expect(
      syncItemSchema.safeParse({ ...itemBase, table: "otra_tabla" }).success
    ).toBe(false);
  });
});

describe("syncBatchSchema", () => {
  it("acepta un batch válido", () => {
    expect(syncBatchSchema.safeParse({ items: [itemBase] }).success).toBe(true);
  });

  it("rechaza batch vacío y batch que excede el límite", () => {
    expect(syncBatchSchema.safeParse({ items: [] }).success).toBe(false);
    const items = Array.from({ length: BATCH_MAX + 1 }, (_, i) => ({
      ...itemBase,
      tempId: `temp-${i}`,
    }));
    const parsed = syncBatchSchema.safeParse({ items });
    expect(parsed.success).toBe(false);
  });

  it("acepta batch en el límite exacto", () => {
    const items = Array.from({ length: BATCH_MAX }, (_, i) => ({
      ...itemBase,
      tempId: `temp-${i}`,
    }));
    expect(syncBatchSchema.safeParse({ items }).success).toBe(true);
  });
});

describe("temperaturaSyncSchema", () => {
  it("acepta un registro válido", () => {
    expect(
      temperaturaSyncSchema.safeParse({
        id_perfil: 2,
        minuto: 0.5,
        temperatura_registrada: 220,
      }).success
    ).toBe(true);
  });

  it("rechaza tipos, IDs y rangos inválidos", () => {
    expect(
      temperaturaSyncSchema.safeParse({
        id_perfil: 0,
        minuto: 1,
        temperatura_registrada: 180,
      }).success
    ).toBe(false);
    expect(
      temperaturaSyncSchema.safeParse({
        id_perfil: 1,
        minuto: -1,
        temperatura_registrada: 180,
      }).success
    ).toBe(false);
    expect(
      temperaturaSyncSchema.safeParse({
        id_perfil: 1,
        minuto: 1,
        temperatura_registrada: 69.9,
      }).success
    ).toBe(false);
    expect(
      temperaturaSyncSchema.safeParse({
        id_perfil: 1,
        minuto: 1,
        temperatura_registrada: 220.1,
      }).success
    ).toBe(false);
  });
});

describe("hitoSyncSchema", () => {
  it("acepta hito con valores nulos", () => {
    expect(
      hitoSyncSchema.safeParse({
        id_perfil: 1,
        tipo_hito: "Crack Inicial",
        tiempo_min: null,
        temperatura: null,
      }).success
    ).toBe(true);
  });

  it("rechaza tipo_hito fuera del enum", () => {
    expect(
      hitoSyncSchema.safeParse({
        id_perfil: 1,
        tipo_hito: "Otro hito",
        tiempo_min: 5,
        temperatura: 190,
      }).success
    ).toBe(false);
  });
});

describe("ajusteSyncSchema", () => {
  it("acepta ajuste mínimo y completo", () => {
    expect(
      ajusteSyncSchema.safeParse({ id_perfil: 1, orden_secuencia: 0 }).success
    ).toBe(true);
    expect(
      ajusteSyncSchema.safeParse({
        id_perfil: 1,
        orden_secuencia: 2,
        temperatura_ajuste: 180,
        llama: "media",
        tiempo: 4,
        aire: "alto",
      }).success
    ).toBe(true);
  });

  it("rechaza secuencia negativa y strings demasiado largos", () => {
    expect(
      ajusteSyncSchema.safeParse({ id_perfil: 1, orden_secuencia: -1 }).success
    ).toBe(false);
    expect(
      ajusteSyncSchema.safeParse({
        id_perfil: 1,
        orden_secuencia: 1,
        llama: "x".repeat(51),
      }).success
    ).toBe(false);
  });
});

describe("metricaSyncSchema", () => {
  it("acepta métrica válida y rechaza tipo inválido", () => {
    expect(
      metricaSyncSchema.safeParse({
        id_perfil: 1,
        tipo_metrica: "Humedad",
        valor_antes: 12.5,
        valor_despues: 11.1,
      }).success
    ).toBe(true);
    expect(
      metricaSyncSchema.safeParse({
        id_perfil: 1,
        tipo_metrica: "Color",
        valor_antes: 1,
        valor_despues: 2,
      }).success
    ).toBe(false);
  });
});

describe("servicioEjecutadoSyncSchema", () => {
  it("acepta registro mínimo con campos opcionales", () => {
    expect(
      servicioEjecutadoSyncSchema.safeParse({
        id_orden: 3,
        tipo_servicio: "Tueste",
      }).success
    ).toBe(true);
  });

  it("rechaza IDs y montos inválidos", () => {
    expect(
      servicioEjecutadoSyncSchema.safeParse({
        id_orden: 0,
        tipo_servicio: "Tueste",
      }).success
    ).toBe(false);
    expect(
      servicioEjecutadoSyncSchema.safeParse({
        id_orden: 1,
        tipo_servicio: "",
      }).success
    ).toBe(false);
  });
});
