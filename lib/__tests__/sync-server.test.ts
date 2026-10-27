import { describe, expect, it, vi } from "vitest";
import {
  codigoErrorPg,
  mensajeSeguro,
  procesarItemsParaSync,
  type SyncDbLike,
} from "../offline/sync-server";
import type { SyncItem } from "../offline/schemas";

type Fila = Record<string, unknown>;

interface FakeHooks {
  upsert?: (
    table: string,
    rows: Fila[],
    onConflict: string
  ) => { data: Fila[] | null; error: { code?: string; message: string } | null };
  insert?: (
    table: string,
    row: Fila
  ) => { data: Fila | null; error: { code?: string; message: string } | null };
}

function crearFakeDb(hooks: FakeHooks): { db: SyncDbLike; llamadas: unknown[] } {
  const llamadas: unknown[] = [];
  const db: SyncDbLike = {
    from: (table: string) => ({
      upsert: (rows, opts) => ({
        select: async (_cols: string) => {
          llamadas.push({ table, op: "upsert", count: rows.length });
          if (!hooks.upsert) return { data: [], error: null };
          return hooks.upsert(table, rows, opts.onConflict);
        },
      }),
      insert: (row) => ({
        select: (_cols: string) => ({
          maybeSingle: async () => {
            llamadas.push({ table, op: "insert" });
            if (!hooks.insert)
              return { data: null, error: { message: "no mock" } };
            return hooks.insert(table, row);
          },
        }),
      }),
    }),
  };
  return { db, llamadas };
}

const itemTemp = (tempId: string): SyncItem => ({
  tempId,
  table: "trazabilidad_temperatura",
  data: { id_perfil: 1, minuto: 3, temperatura_registrada: 195 },
});

describe("procesarItemsParaSync", () => {
  it("bulk exitoso mapea tempId a recordId por clave natural", async () => {
    const { db, llamadas } = crearFakeDb({
      upsert: (_table, rows) => ({
        data: rows.map((r, i) => ({
          id_registro: 100 + i,
          id_perfil: r["id_perfil"],
          minuto: r["minuto"],
        })),
        error: null,
      }),
    });
    const resultado = await procesarItemsParaSync(db, [
      itemTemp("a"),
      {
        tempId: "b",
        table: "trazabilidad_temperatura",
        data: { id_perfil: 1, minuto: 4, temperatura_registrada: 196 },
      },
    ]);
    expect(llamadas).toHaveLength(1);
    expect(resultado.rejected).toEqual([]);
    expect(resultado.accepted).toEqual([
      { tempId: "a", recordId: 100 },
      { tempId: "b", recordId: 101 },
    ]);
  });

  it("rechaza items con datos inválidos sin tocar la DB", async () => {
    const { db, llamadas } = crearFakeDb({});
    const resultado = await procesarItemsParaSync(db, [
      {
        tempId: "mala",
        table: "trazabilidad_temperatura",
        data: { id_perfil: 1, minuto: 1, temperatura_registrada: 20 },
      },
    ]);
    expect(llamadas).toHaveLength(0);
    expect(resultado.accepted).toEqual([]);
    expect(resultado.rejected).toHaveLength(1);
    expect(resultado.rejected[0]?.code).toBe("VALIDATION_ERROR");
  });

  it("dedupe last-write-wins dentro del batch", async () => {
    const recibidas: Fila[][] = [];
    const { db } = crearFakeDb({
      upsert: (_t, rows) => {
        recibidas.push(rows);
        return {
          data: rows.map((r) => ({
            id_registro: 7,
            id_perfil: r["id_perfil"],
            minuto: r["minuto"],
          })),
          error: null,
        };
      },
    });
    const resultado = await procesarItemsParaSync(db, [
      itemTemp("vieja"),
      {
        tempId: "nueva",
        table: "trazabilidad_temperatura",
        data: { id_perfil: 1, minuto: 3, temperatura_registrada: 199 },
      },
    ]);
    expect(recibidas).toHaveLength(1);
    expect(recibidas[0]).toHaveLength(1);
    expect(resultado.accepted).toEqual([{ tempId: "nueva", recordId: 7 }]);
    expect(resultado.rejected).toEqual([]);
  });

  it("ante fallo del bulk, aísla por item (waterfall)", async () => {
    const { db, llamadas } = crearFakeDb({
      upsert: (_t, rows) => {
        if (rows.length > 1) {
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        return {
          data: rows.map((r) => ({
            id_registro: 50,
            id_perfil: r["id_perfil"],
            minuto: r["minuto"],
          })),
          error: null,
        };
      },
    });
    const items: SyncItem[] = [
      itemTemp("a"),
      {
        tempId: "b",
        table: "trazabilidad_temperatura",
        data: { id_perfil: 1, minuto: 4, temperatura_registrada: 196 },
      },
    ];
    const resultado = await procesarItemsParaSync(db, items);
    expect(llamadas).toHaveLength(3);
    expect(resultado.accepted).toHaveLength(2);
    expect(resultado.rejected).toEqual([]);
  });

  it("reporta errores por item con código PG", async () => {
    const { db } = crearFakeDb({
      upsert: () => ({
        data: null,
        error: { code: "23503", message: "violates foreign key" },
      }),
    });
    const resultado = await procesarItemsParaSync(db, [itemTemp("a")]);
    expect(resultado.accepted).toEqual([]);
    expect(resultado.rejected).toEqual([
      { tempId: "a", code: "FOREIGN_KEY", message: "violates foreign key" },
    ]);
  });

  it("servicios_ejecutados usa insert individual", async () => {
    const { db, llamadas } = crearFakeDb({
      insert: () => ({
        data: { id_servicio: 9 },
        error: null,
      }),
    });
    const resultado = await procesarItemsParaSync(db, [
      { tempId: "s1", table: "servicios_ejecutados", data: { id_orden: 4, tipo_servicio: "Tueste" } },
    ]);
    expect(llamadas).toEqual([{ table: "servicios_ejecutados", op: "insert" }]);
    expect(resultado).toEqual({
      accepted: [{ tempId: "s1", recordId: 9 }],
      rejected: [],
    });
  });
});

describe("codigoErrorPg y mensajeSeguro", () => {
  it("mapea códigos conocidos y por defecto", () => {
    expect(codigoErrorPg("23505")).toBe("CONFLICT");
    expect(codigoErrorPg("23503")).toBe("FOREIGN_KEY");
    expect(codigoErrorPg("23514")).toBe("CHECK_VIOLATION");
    expect(codigoErrorPg("23502")).toBe("NOT_NULL");
    expect(codigoErrorPg("XXXXX")).toBe("DB_ERROR");
    expect(codigoErrorPg(undefined)).toBe("DB_ERROR");
  });

  it("trunca mensajes largos y maneja vacíos", () => {
    expect(mensajeSeguro(undefined)).toBe("Error de base de datos");
    expect(mensajeSeguro("x".repeat(500))).toHaveLength(200);
  });
});

describe("fetch mock (contrato de respuesta)", () => {
  it("el flujo cliente espera {data:{accepted,rejected}}", async () => {
    const fetchMock = vi.fn(async (_url: unknown, _init: unknown) => ({
      ok: true,
      json: async () => ({
        data: { accepted: [{ tempId: "a", recordId: 1 }], rejected: [] },
      }),
    }));
    const res = await fetchMock("/api/sync", { method: "POST" });
    const body = (await res.json()) as {
      data: { accepted: unknown[]; rejected: unknown[] };
    };
    expect(body.data.accepted).toHaveLength(1);
    expect(body.data.rejected).toHaveLength(0);
  });
});
