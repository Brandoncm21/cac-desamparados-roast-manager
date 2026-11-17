import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiError } from "../api/http";
import {
  guardarCatacion,
  listarLotesCatacion,
  obtenerCatacion,
} from "../api/cataciones";
import type { CatacionPayload } from "../schemas/catacion";

function respuestaOk(data: unknown, status = 200): Response {
  return { ok: true, status, json: async () => ({ data }) } as unknown as Response;
}

function respuestaError(message: string, status: number): Response {
  return { ok: false, status, json: async () => ({ error: { message } }) } as unknown as Response;
}

const fetchMock = vi.fn();

function urlLlamada(indice = 0): string {
  const llamada = fetchMock.mock.calls[indice];
  if (!llamada) throw new Error(`no hubo llamada a fetch en el índice ${indice}`);
  return String(llamada[0]);
}

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

describe("lib/api/cataciones", () => {
  it("debería listar sin filtro de estado y devolver la paginación", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id_lote: 1, nlote: "L-001", catado: false }],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      }),
    } as unknown as Response);

    const resultado = await listarLotesCatacion();

    expect(urlLlamada()).toBe("/api/cataciones?page=1&pageSize=10&estado=todos");
    expect(resultado.lotes).toEqual([{ id_lote: 1, nlote: "L-001", catado: false }]);
    expect(resultado.pagination.total).toBe(1);
  });

  it("debería enviar el filtro catado y la búsqueda", async () => {
    fetchMock.mockResolvedValue(respuestaOk([]));

    await listarLotesCatacion({ estado: "si", search: "  loma  ", page: 2, pageSize: 25 });

    expect(urlLlamada()).toBe("/api/cataciones?page=2&pageSize=25&estado=si&search=loma");
  });

  it("debería omitir la búsqueda vacía", async () => {
    fetchMock.mockResolvedValue(respuestaOk([]));

    await listarLotesCatacion({ estado: "no", search: "   " });

    expect(urlLlamada()).toBe("/api/cataciones?page=1&pageSize=10&estado=no");
  });

  it("debería obtener una catación por id", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_catacion_tueste: 5, catado: true }));

    const catacion = await obtenerCatacion(5);

    expect(urlLlamada()).toBe("/api/cataciones/5");
    expect(catacion).toEqual({ id_catacion_tueste: 5, catado: true });
  });

  it("debería crear con POST cuando no hay id", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ catacion: { id_catacion_tueste: 9 } }, 201));

    await guardarCatacion({ id_lote: 3, catado: true, notas_catacion: "ok" } as CatacionPayload);

    expect(urlLlamada()).toBe("/api/cataciones");
    expect(initLlamada().method).toBe("POST");
    expect(JSON.parse(String(initLlamada().body))).toEqual({
      id_lote: 3,
      catado: true,
      notas_catacion: "ok",
    });
  });

  it("debería actualizar con PUT cuando hay id", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ catacion: { id_catacion_tueste: 9 } }));

    await guardarCatacion({ id_catacion_tueste: 9, id_lote: 3, catado: false } as CatacionPayload);

    expect(urlLlamada()).toBe("/api/cataciones/9");
    expect(initLlamada().method).toBe("PUT");
  });

  it("debería propagar el mensaje del servidor", async () => {
    fetchMock.mockResolvedValue(respuestaError("El lote indicado no existe", 400));

    const error = await guardarCatacion({ id_lote: 99 } as CatacionPayload).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("El lote indicado no existe");
  });
});
