import { describe, it, expect } from "vitest";
import {
  crearLoteSchema,
  actualizarLoteSchema,
  listarLotesFiltrosSchema,
} from "../schemas/lotes";

const loteValido = {
  nlote: "LOTE-2024-001",
  nrecibo: 12345,
  nproductor: "José Pérez",
  nfinca: "La Esperanza",
  zona: "Tarrazú",
  altura: 1500,
  robjetivo: 85.5,
  disponible: 1000,
  miel: true,
};

describe("crearLoteSchema", () => {
  it("acepta un lote válido completo", () => {
    const result = crearLoteSchema.safeParse(loteValido);
    expect(result.success).toBe(true);
  });

  it("aplica defaults portados del CBF (FR-010/FR-011)", () => {
    const result = crearLoteSchema.parse(loteValido);
    expect(result.vendido).toBe(false);
    expect(result.enproceso).toBe("No");
    expect(result.semilavado).toBe(false);
    expect(result["natural"]).toBe(false);
    expect(result.anaerobico).toBe(false);
    expect(result.lavado).toBe(false);
  });

  it("rechaza nlote vacío o mayor a 100", () => {
    expect(crearLoteSchema.safeParse({ ...loteValido, nlote: "" }).success).toBe(false);
    expect(
      crearLoteSchema.safeParse({ ...loteValido, nlote: "x".repeat(101) }).success
    ).toBe(false);
  });

  it("rechaza nproductor/nfinca vacíos (disp. 10: NOT NULL consciente)", () => {
    expect(crearLoteSchema.safeParse({ ...loteValido, nproductor: "" }).success).toBe(false);
    expect(crearLoteSchema.safeParse({ ...loteValido, nfinca: "" }).success).toBe(false);
  });

  it("rechaza enproceso fuera de la lista del CHECK", () => {
    const result = crearLoteSchema.safeParse({ ...loteValido, enproceso: "En Secando" });
    expect(result.success).toBe(false);
  });

  it("convierte NaN numérico en null (preproceso nullifyNaN)", () => {
    const result = crearLoteSchema.parse({ ...loteValido, altura: NaN });
    expect(result.altura).toBeNull();
  });

  it("acepta numéricos opcionales vacíos", () => {
    const result = crearLoteSchema.safeParse({ ...loteValido, altura: "", robjetivo: null });
    expect(result.success).toBe(true);
  });
});

describe("actualizarLoteSchema", () => {
  it("no permite cambiar nlote (convención CBF: PK-like)", () => {
    const result = actualizarLoteSchema.parse({
      nlote: "LOTE-OTRO",
      nfinca: "Finca Nueva",
    });
    expect(result).not.toHaveProperty("nlote");
    expect(result.nfinca).toBe("Finca Nueva");
  });

  it("acepta actualización parcial de cualquier campo", () => {
    const result = actualizarLoteSchema.parse({ disponible: 500 });
    expect(result.disponible).toBe(500);
  });
});

describe("listarLotesFiltrosSchema", () => {
  it("acepta filtros vacíos", () => {
    expect(listarLotesFiltrosSchema.safeParse({}).success).toBe(true);
    expect(listarLotesFiltrosSchema.safeParse({ enproceso: "", desde: "", hasta: "" }).success).toBe(true);
  });

  it("acepta enproceso válido del CHECK (FR-011)", () => {
    expect(
      listarLotesFiltrosSchema.safeParse({ enproceso: "En Secado" }).success
    ).toBe(true);
  });

  it("rechaza enproceso o fechas mal formadas (422)", () => {
    expect(
      listarLotesFiltrosSchema.safeParse({ enproceso: "En Secando" }).success
    ).toBe(false);
    expect(
      listarLotesFiltrosSchema.safeParse({ desde: "06-11-2026" }).success
    ).toBe(false);
  });
});
