import { describe, expect, it } from "vitest";
import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  agruparPorTabla,
  backoffMs,
  chunk,
  claveNatural,
  dedupePorClave,
} from "../offline/sync-utils";

describe("backoffMs", () => {
  it("crece exponencialmente desde la base", () => {
    expect(backoffMs(0)).toBe(BACKOFF_BASE_MS);
    expect(backoffMs(1)).toBe(BACKOFF_BASE_MS * 2);
    expect(backoffMs(2)).toBe(BACKOFF_BASE_MS * 4);
  });

  it("normaliza negativos y limita al máximo", () => {
    expect(backoffMs(-5)).toBe(BACKOFF_BASE_MS);
    expect(backoffMs(100)).toBe(BACKOFF_MAX_MS);
    expect(backoffMs(10)).toBeLessThanOrEqual(BACKOFF_MAX_MS);
  });
});

describe("chunk", () => {
  it("divide en lotes del tamaño pedido", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("devuelve un solo lote si cabe todo", () => {
    expect(chunk([1, 2], 200)).toEqual([[1, 2]]);
  });

  it("lote vacío produce cero lotes", () => {
    expect(chunk([], 200)).toEqual([]);
  });
});

describe("claveNatural", () => {
  it("compone claves por tabla", () => {
    expect(
      claveNatural("trazabilidad_temperatura", { id_perfil: 1, minuto: 3 })
    ).toBe("1:3");
    expect(
      claveNatural("hitos_termicos", { id_perfil: 1, tipo_hito: "Final" })
    ).toBe("1:Final");
    expect(
      claveNatural("ajustes_tueste", { id_perfil: 2, orden_secuencia: 0 })
    ).toBe("2:0");
    expect(
      claveNatural("metricas_tueste", { id_perfil: 2, tipo_metrica: "Peso" })
    ).toBe("2:Peso");
  });

  it("retorna null para tablas sin clave natural", () => {
    expect(claveNatural("servicios_ejecutados", { id_orden: 1 })).toBeNull();
  });
});

describe("dedupePorClave", () => {
  it("conserva el último por clave natural (last-write-wins)", () => {
    const items = [
      { table: "trazabilidad_temperatura", tempId: "a", data: { id_perfil: 1, minuto: 3, temperatura_registrada: 190 } },
      { table: "trazabilidad_temperatura", tempId: "b", data: { id_perfil: 1, minuto: 3, temperatura_registrada: 195 } },
      { table: "trazabilidad_temperatura", tempId: "c", data: { id_perfil: 1, minuto: 4, temperatura_registrada: 196 } },
    ];
    const resultado = dedupePorClave(items);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((i) => i.tempId).sort()).toEqual(["b", "c"]);
  });

  it("conserva todos los de tablas sin clave natural", () => {
    const items = [
      { table: "servicios_ejecutados", tempId: "a", data: { id_orden: 1 } },
      { table: "servicios_ejecutados", tempId: "b", data: { id_orden: 1 } },
    ];
    expect(dedupePorClave(items)).toHaveLength(2);
  });

  it("reproceso idempotente: dedupe del mismo batch da el mismo resultado", () => {
    const items = [
      { table: "hitos_termicos", tempId: "a", data: { id_perfil: 1, tipo_hito: "Final" } },
      { table: "hitos_termicos", tempId: "b", data: { id_perfil: 1, tipo_hito: "Final" } },
    ];
    const primera = dedupePorClave(items);
    const segunda = dedupePorClave([...items, ...primera]);
    expect(segunda).toHaveLength(1);
    expect(segunda[0]?.tempId).toBe("b");
  });
});

describe("agruparPorTabla", () => {
  it("agrupa items por tabla preservando orden", () => {
    const items = [
      { table: "a", tempId: "1", data: {} },
      { table: "b", tempId: "2", data: {} },
      { table: "a", tempId: "3", data: {} },
    ];
    const grupos = agruparPorTabla(items);
    expect(grupos.get("a")?.map((i) => i.tempId)).toEqual(["1", "3"]);
    expect(grupos.get("b")?.map((i) => i.tempId)).toEqual(["2"]);
  });
});
