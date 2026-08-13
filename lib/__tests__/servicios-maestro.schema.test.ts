import { describe, it, expect } from "vitest";
import {
  crearServicioMaestroSchema,
  crearEmpaqueSchema,
  crearPrecioServicioSchema,
  crearPrecioEmpaqueSchema,
} from "../schemas/servicios-maestro";

describe("crearServicioMaestroSchema", () => {
  it("acepta un servicio válido", () => {
    const result = crearServicioMaestroSchema.safeParse({
      codigo: "TUE-MED",
      nombre: "Tueste Medio",
      default_peso_kg: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza servicio sin nombre", () => {
    const result = crearServicioMaestroSchema.safeParse({ codigo: "X" });
    expect(result.success).toBe(false);
  });

  it("rechaza precio por kg negativo", () => {
    const result = crearPrecioServicioSchema.safeParse({ precio_por_kg: -5 });
    expect(result.success).toBe(false);
  });

  it("acepta precio por kg de 0", () => {
    const result = crearPrecioServicioSchema.safeParse({ precio_por_kg: 0 });
    expect(result.success).toBe(true);
  });

  it("acepta default_peso_kg null", () => {
    const result = crearServicioMaestroSchema.safeParse({
      codigo: "X",
      nombre: "Test",
      default_peso_kg: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_peso_kg).toBeNull();
    }
  });
});

describe("crearEmpaqueSchema", () => {
  it("acepta un empaque válido", () => {
    const result = crearEmpaqueSchema.safeParse({
      nombre: "Bolsa con válvula 1Kg",
      unit_weight_kg: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza empaque sin nombre", () => {
    const result = crearEmpaqueSchema.safeParse({ unit_weight_kg: 1 });
    expect(result.success).toBe(false);
  });

  it("rechaza precio de empaque negativo", () => {
    const result = crearPrecioEmpaqueSchema.safeParse({ precio: -1 });
    expect(result.success).toBe(false);
  });
});
