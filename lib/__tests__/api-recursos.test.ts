import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiError } from "../api/http";
import { listarLotes } from "../api/lotes";
import { listarServiciosActivos } from "../api/servicios";
import {
  cambiarEstadoOrden,
  crearOrden,
  ejecutarAccionPaso,
  eliminarOrden,
  listarPasosOrden,
} from "../api/ordenes";
import { crearPerfilTueste } from "../api/perfiles-tueste";
import type { CrearOrdenInput } from "../schemas/ordenes";

function respuestaOk(data: unknown, status = 200): Response {
  return { ok: true, status, json: async () => ({ data }) } as unknown as Response;
}

function respuestaError(
  error: { code?: string; message?: string; issues?: unknown },
  status: number
): Response {
  return { ok: false, status, json: async () => ({ error }) } as unknown as Response;
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

describe("lib/api/lotes", () => {
  it("debería pedir la primera página con el pageSize indicado", async () => {
    fetchMock.mockResolvedValue(respuestaOk([{ id_lote: 1, nlote: "L-001" }]));

    const lotes = await listarLotes();

    expect(urlLlamada()).toBe("/api/lotes?page=1&pageSize=100");
    expect(initLlamada().method).toBeUndefined();
    expect(lotes).toEqual([{ id_lote: 1, nlote: "L-001" }]);
  });

  it("debería respetar un pageSize explícito", async () => {
    fetchMock.mockResolvedValue(respuestaOk([]));

    await listarLotes({ pageSize: 25, page: 2 });

    expect(urlLlamada()).toBe("/api/lotes?page=2&pageSize=25");
  });
});

describe("lib/api/servicios", () => {
  it("debería devolver servicios y empaques activos", async () => {
    const payload = {
      servicios: [{ id_servicio_maestro: 3, nombre: "Tueste", tipo: "tueste" }],
      empaques: [{ id_empaque: 2, nombre: "Bolsa 1Kg", precio: 450 }],
    };
    fetchMock.mockResolvedValue(respuestaOk(payload));

    const resultado = await listarServiciosActivos();

    expect(urlLlamada()).toBe("/api/servicios-activos");
    expect(resultado).toEqual(payload);
  });
});

describe("lib/api/ordenes", () => {
  const entrada = {
    id_cliente: 5,
    servicios: [{ servicio_id: 3, tipo_servicio: "Tueste" }],
    lotes: [],
  } as unknown as CrearOrdenInput;

  it("debería crear la orden con POST y cuerpo JSON", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_orden: 42 }, 201));

    const orden = await crearOrden(entrada);

    expect(urlLlamada()).toBe("/api/ordenes");
    expect(initLlamada().method).toBe("POST");
    expect(initLlamada().headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(initLlamada().body))).toEqual(entrada);
    expect(orden).toEqual({ id_orden: 42 });
  });

  it("debería propagar ApiError con fieldErrors en un 422", async () => {
    fetchMock.mockResolvedValue(
      respuestaError(
        {
          code: "VALIDATION_ERROR",
          message: "Validación fallida",
          issues: { formErrors: [], fieldErrors: { id_cliente: ["Requerido"] } },
        },
        422
      )
    );

    const error = await crearOrden(entrada).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.fieldErrors).toEqual({ id_cliente: ["Requerido"] });
  });

  it("debería listar los pasos de una orden", async () => {
    fetchMock.mockResolvedValue(respuestaOk([{ id_paso: 9, prioridad: 1 }]));

    const pasos = await listarPasosOrden(7);

    expect(urlLlamada()).toBe("/api/ordenes/7/pasos");
    expect(pasos).toEqual([{ id_paso: 9, prioridad: 1 }]);
  });

  it("debería cambiar el estado con PATCH y el campo estado_orden", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_orden: 7, estado_orden: "Completado" }));

    await cambiarEstadoOrden(7, "Completado");

    expect(urlLlamada()).toBe("/api/ordenes/7/estado");
    expect(initLlamada().method).toBe("PATCH");
    expect(JSON.parse(String(initLlamada().body))).toEqual({ estado_orden: "Completado" });
  });

  it("debería ejecutar una acción sobre un paso con POST", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_paso: 9, estado: "EN_PROCESO" }));

    await ejecutarAccionPaso(7, 9, "iniciar", { peso_inicial_kg: 12.5 });

    expect(urlLlamada()).toBe("/api/ordenes/7/pasos/9/iniciar");
    expect(initLlamada().method).toBe("POST");
    expect(initLlamada().headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(initLlamada().body))).toEqual({ peso_inicial_kg: 12.5 });
  });

  it("debería lanzar ApiError cuando la acción del paso es rechazada", async () => {
    fetchMock.mockResolvedValue(
      respuestaError({ message: "El paso no está en proceso" }, 409)
    );

    const error = await ejecutarAccionPaso(7, 9, "cerrar", {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe("El paso no está en proceso");
  });

  it("debería eliminar con DELETE al id correcto", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ deleted: true }));

    await eliminarOrden(7);

    expect(urlLlamada()).toBe("/api/ordenes/7");
    expect(initLlamada().method).toBe("DELETE");
  });

  it("debería lanzar ApiError cuando el servidor rechaza el borrado", async () => {
    fetchMock.mockResolvedValue(
      respuestaError({ message: "Orden no encontrada, ya eliminada o sin permisos" }, 404)
    );

    const error = await eliminarOrden(7).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
  });
});

describe("lib/api/perfiles-tueste", () => {
  it("debería crear el perfil con POST y devolver id_perfil", async () => {
    fetchMock.mockResolvedValue(respuestaOk({ id_perfil: 88 }, 201));

    const perfil = await crearPerfilTueste({ id_orden: 7, nombre_cafe: "Tueste orden #7" });

    expect(urlLlamada()).toBe("/api/perfiles-tueste");
    expect(initLlamada().method).toBe("POST");
    expect(JSON.parse(String(initLlamada().body))).toEqual({
      id_orden: 7,
      nombre_cafe: "Tueste orden #7",
    });
    expect(perfil).toEqual({ id_perfil: 88 });
  });
});
