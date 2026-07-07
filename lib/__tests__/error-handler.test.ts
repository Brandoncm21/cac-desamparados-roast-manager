import { describe, it, expect } from "vitest";
import { AppError, ERROR_CODES, handleApiError } from "../error-handler";
import { ZodError, z } from "zod";

describe("error-handler", () => {
  describe("AppError", () => {
    it("debería crear un error con código, mensaje y status", () => {
      const error = new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        "Datos inválidos",
        422,
        { field: "nombre" }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.message).toBe("Datos inválidos");
      expect(error.status).toBe(422);
      expect(error.details).toEqual({ field: "nombre" });
    });
  });

  describe("handleApiError", () => {
    it("debería manejar AppError correctamente", () => {
      const error = new AppError(
        ERROR_CODES.UNAUTHORIZED,
        "No autorizado",
        401
      );

      const result = handleApiError(error);

      expect(result.status).toBe(401);
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(result.error.message).toBe("No autorizado");
    });

    it("debería manejar errores de Zod correctamente", () => {
      const schema = z.object({ nombre: z.string().min(1) });
      let zodError: ZodError | null = null;

      try {
        schema.parse({ nombre: "" });
      } catch (error) {
        zodError = error as ZodError;
      }

      expect(zodError).not.toBeNull();
      const result = handleApiError(zodError!);

      expect(result.status).toBe(422);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it("debería manejar errores desconocidos como 500", () => {
      const result = handleApiError(new Error("Error inesperado"));

      expect(result.status).toBe(500);
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(result.error.message).toBe("Error interno del servidor");
    });
  });
});
