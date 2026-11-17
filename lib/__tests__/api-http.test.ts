import { describe, it, expect } from "vitest";
import { ApiError, leerJson, mensajeDeError, detalleDeError } from "../api/http";

/** Respuesta mínima: evita depender de `Response` global según el entorno. */
function respuesta(
  cuerpo: unknown,
  status = 200,
  { jsonFalla = false }: { jsonFalla?: boolean } = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (jsonFalla) throw new SyntaxError("Unexpected token < in JSON");
      return cuerpo;
    },
  } as unknown as Response;
}

/** Captura el error esperado conservando el tipo para las aserciones. */
async function errorDe(promesa: Promise<unknown>): Promise<ApiError> {
  try {
    await promesa;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("se esperaba que la promesa rechazara");
}

describe("lib/api/http", () => {
  describe("leerJson", () => {
    it("debería devolver el payload `data` cuando la respuesta es exitosa", async () => {
      const res = respuesta({ data: [{ id_cliente: 1 }, { id_cliente: 2 }] });

      await expect(leerJson(res)).resolves.toEqual([
        { id_cliente: 1 },
        { id_cliente: 2 },
      ]);
    });

    it("debería lanzar ApiError con status, código y mensaje del servidor", async () => {
      const res = respuesta(
        { error: { code: "FORBIDDEN", message: "No tiene permisos para esta acción" } },
        403
      );

      const error = await errorDe(leerJson(res));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe("No tiene permisos para esta acción");
    });

    it("debería agrupar fieldErrors cuando `issues` es un ZodError serializado", async () => {
      const res = respuesta(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            issues: [
              { path: ["id_cliente"], message: "Debe seleccionar un cliente" },
              { path: ["servicios", 0, "servicio_id"], message: "Inválido" },
              { path: [], message: "Forma inválida" },
            ],
          },
        },
        422
      );

      const error = await errorDe(leerJson(res));

      expect(error.fieldErrors).toEqual({
        id_cliente: ["Debe seleccionar un cliente"],
        "servicios.0.servicio_id": ["Inválido"],
      });
      expect(error.formErrors).toEqual(["Forma inválida"]);
    });

    it("debería agrupar fieldErrors cuando `issues` ya viene aplanado", async () => {
      const res = respuesta(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validación fallida",
            issues: {
              formErrors: ["Falla general"],
              fieldErrors: { nombre: ["Requerido"] },
            },
          },
        },
        422
      );

      const error = await errorDe(leerJson(res));

      expect(error.fieldErrors).toEqual({ nombre: ["Requerido"] });
      expect(error.formErrors).toEqual(["Falla general"]);
    });

    it("debería usar un mensaje de respaldo cuando el cuerpo no es JSON", async () => {
      const res = respuesta(null, 500, { jsonFalla: true });

      const error = await errorDe(leerJson(res));

      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(500);
      expect(error.message).toBe("Error HTTP 500");
      expect(error.fieldErrors).toEqual({});
      expect(error.formErrors).toEqual([]);
    });

    it("debería preferir el mensaje del servidor cuando el cuerpo no trae error tipado", async () => {
      const res = respuesta({ error: { message: "Finca no encontrada" } }, 404);

      const error = await errorDe(leerJson(res));

      expect(error.status).toBe(404);
      expect(error.code).toBeUndefined();
      expect(error.message).toBe("Finca no encontrada");
    });
  });

  describe("mensajeDeError", () => {
    it("debería devolver el mensaje de un ApiError", () => {
      const error = new ApiError("No autorizado", 401);

      expect(mensajeDeError(error)).toBe("No autorizado");
    });

    it("debería devolver el mensaje de un Error nativo", () => {
      expect(mensajeDeError(new Error("falló la red"))).toBe("falló la red");
    });

    it("debería devolver un texto genérico para valores desconocidos", () => {
      expect(mensajeDeError("boom")).toBe("Error desconocido");
      expect(mensajeDeError(undefined)).toBe("Error desconocido");
    });
  });

  describe("detalleDeError", () => {
    it("debería concatenar los mensajes por campo", () => {
      const error = new ApiError("Validación fallida", 422, {
        fieldErrors: { id_cliente: ["Requerido"], servicios: ["Agregue uno"] },
      });

      expect(detalleDeError(error)).toBe("Requerido, Agregue uno");
    });

    it("debería usar los errores de formulario si no hay errores por campo", () => {
      const error = new ApiError("Validación fallida", 422, {
        formErrors: ["Falla general"],
      });

      expect(detalleDeError(error)).toBe("Falla general");
    });

    it("debería caer al mensaje del error cuando no hay detalles", () => {
      expect(detalleDeError(new ApiError("No autorizado", 401))).toBe("No autorizado");
      expect(detalleDeError(new Error("sin red"))).toBe("sin red");
    });
  });
});
