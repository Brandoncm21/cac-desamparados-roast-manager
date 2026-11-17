import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  actualizarFinca,
  crearFinca,
  eliminarFinca,
  etiquetaFinca,
  listarFincas,
  listarZonas,
  obtenerFinca,
  opcionesCliente,
  opcionesFinca,
} from "../fincas";

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

describe("lib/fincas · transporte", () => {
  it("debería listar fincas de un cliente con búsqueda normalizada", async () => {
    fetchMock.mockResolvedValue(respuestaOk([{ id_finca: 1, nombre: "El Roble" }]));

    const fincas = await listarFincas({ clienteId: 3, search: "  roble  ", pageSize: 50 });

    expect(urlLlamada()).toBe("/api/fincas?page=1&pageSize=50&cliente_id=3&search=roble");
    expect(fincas).toEqual([{ id_finca: 1, nombre: "El Roble" }]);
  });

  it("debería omitir filtros vacíos", async () => {
    fetchMock.mockResolvedValue(respuestaOk([]));

    await listarFincas({ search: "   " });

    expect(urlLlamada()).toBe("/api/fincas?page=1&pageSize=100");
  });

  it("debería crear una finca con POST y cuerpo JSON", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_finca: 9 }, 201));

    await crearFinca({ cliente_id: 2, nombre: "La Loma", altura: 1200 });

    expect(urlLlamada()).toBe("/api/fincas");
    expect(initLlamada().method).toBe("POST");
    expect(JSON.parse(String(initLlamada().body))).toEqual({
      cliente_id: 2,
      nombre: "La Loma",
      altura: 1200,
    });
  });

  it("debería actualizar una finca con PUT al id correcto", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_finca: 9 }));

    await actualizarFinca(9, { nombre: "La Loma Alta" });

    expect(urlLlamada()).toBe("/api/fincas/9");
    expect(initLlamada().method).toBe("PUT");
  });

  it("debería obtener una finca por id", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_finca: 9 }));

    const finca = await obtenerFinca(9);

    expect(urlLlamada()).toBe("/api/fincas/9");
    expect(finca).toEqual({ id_finca: 9 });
  });

  it("debería propagar el mensaje del servidor al fallar la lectura", async () => {
    fetchMock.mockResolvedValue(respuestaError("Finca no encontrada", 404));

    await expect(obtenerFinca(9)).rejects.toThrow("Finca no encontrada");
  });

  it("debería eliminar con DELETE", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ deleted: true }));

    await eliminarFinca(9);

    expect(urlLlamada()).toBe("/api/fincas/9");
    expect(initLlamada().method).toBe("DELETE");
  });

  it("debería propagar el mensaje del servidor al fallar el borrado", async () => {
    fetchMock.mockResolvedValue(respuestaError("La finca tiene lotes asociados", 409));

    await expect(eliminarFinca(9)).rejects.toThrow("La finca tiene lotes asociados");
  });
});

describe("lib/fincas · zonas", () => {
  it("debería aceptar `data` como arreglo", async () => {
    fetchMock.mockResolvedValue(respuestaOk([{ id_zona: 1, nombre: "Tarrazú" }]));

    await expect(listarZonas()).resolves.toEqual([{ id_zona: 1, nombre: "Tarrazú" }]);
  });

  it("debería aceptar `data.zonas`", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ zonas: [{ id_zona: 2, nombre: "Dota" }] }));

    await expect(listarZonas()).resolves.toEqual([{ id_zona: 2, nombre: "Dota" }]);
  });

  it("debería degradar a arreglo vacío si el endpoint falla", async () => {
    fetchMock.mockResolvedValue(respuestaError("boom", 500));

    await expect(listarZonas()).resolves.toEqual([]);
  });
});

describe("lib/fincas · presentación", () => {
  it("debería componer la etiqueta con altura y zona", () => {
    expect(
      etiquetaFinca({ nombre: "El Roble", altura: 1300, zonas_finca: { nombre: "Tarrazú" } })
    ).toBe("El Roble — 1300 msnm · Tarrazú");
  });

  it("debería omitir los datos ausentes en la etiqueta", () => {
    expect(etiquetaFinca({ nombre: "El Roble", altura: null, zonas_finca: null })).toBe("El Roble");
  });

  it("debería mapear fincas y clientes a opciones de Select", () => {
    const fincas = [{ id_finca: 7, cliente_id: 1, nombre: "La Loma", altura: null }];
    expect(opcionesFinca(fincas)).toEqual([{ value: "7", label: "La Loma" }]);
    expect(opcionesCliente([{ id_cliente: 1, nombre_completo: "Ana" }])).toEqual([
      { value: "1", label: "Ana" },
    ]);
  });
});
