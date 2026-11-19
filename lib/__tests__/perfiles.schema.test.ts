import { describe, it, expect } from "vitest";
import { actualizarPerfilSchema, crearPerfilSchema } from "../schemas/perfiles";

describe("crearPerfilSchema", () => {
  it("permite crear sin factura y valida la factura si viene", () => {
    expect(crearPerfilSchema.safeParse({}).success).toBe(true);
    expect(crearPerfilSchema.safeParse({ id_orden: null }).success).toBe(true);
    expect(crearPerfilSchema.safeParse({ id_orden: 0 }).success).toBe(false);
    expect(crearPerfilSchema.safeParse({ id_orden: 3 }).success).toBe(true);
  });

  it("deja lote_ids vacío por defecto y valida IDs positivos", () => {
    const parsed = crearPerfilSchema.parse({});
    expect(parsed.lote_ids).toEqual([]);
    expect(
      crearPerfilSchema.safeParse({ lote_ids: [1, 2] }).success
    ).toBe(true);
    expect(
      crearPerfilSchema.safeParse({ lote_ids: [1, -1] }).success
    ).toBe(false);
  });
});

describe("actualizarPerfilSchema", () => {
  it("sigue siendo parcial y no exige lote_ids", () => {
    expect(actualizarPerfilSchema.safeParse({}).success).toBe(true);
    expect(actualizarPerfilSchema.safeParse({ estado: "Completado" }).success).toBe(true);
  });
});
