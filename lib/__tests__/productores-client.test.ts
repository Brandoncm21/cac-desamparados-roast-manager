import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { crearProductor } from "../api/beneficio";

function respuestaOk(data: unknown, status = 200): Response {
  return { ok: true, status, json: async () => ({ data }) } as unknown as Response;
}

function respuestaError(message: string, status: number): Response {
  return { ok: false, status, json: async () => ({ error: { message } }) } as unknown as Response;
}

const fetchMock = vi.fn();

function initLlamada(indice = 0): RequestInit {
  return (fetchMock.mock.calls[indice]?.[1] ?? {}) as RequestInit;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lib/api/beneficio · crearProductor", () => {
  it("hace POST a /api/productores con sólo las columnas editables", async () => {
    fetchMock.mockResolvedValue(
      respuestaOk({ id_productor: 7, nombre_completo: "Ana Mora", telefono: "8888-8888" }, 201)
    );

    const creado = await crearProductor({
      nombre_completo: "Ana Mora",
      telefono: "8888-8888",
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/productores");
    expect(initLlamada().method).toBe("POST");
    expect(JSON.parse(String(initLlamada().body))).toEqual({
      nombre_completo: "Ana Mora",
      telefono: "8888-8888",
    });
    expect(creado).toEqual({
      id_productor: 7,
      nombre_completo: "Ana Mora",
      telefono: "8888-8888",
    });
  });

  it("propaga el mensaje de duplicado del servidor", async () => {
    fetchMock.mockResolvedValue(
      respuestaError("Ya existe un productor con ese nombre", 409)
    );

    await expect(
      crearProductor({ nombre_completo: "Ana Mora", telefono: null })
    ).rejects.toThrow("Ya existe un productor con ese nombre");
  });
});
