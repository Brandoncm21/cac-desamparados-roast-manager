import { describe, it, expect } from "vitest";
import {
  crearLoteSchema,
  actualizarLoteSchema,
  listarLotesFiltrosSchema,
} from "../schemas/lotes";

const loteValido = {
  nlote: "LOTE-2024-001",
  nrecibo: 12345,
  id_cliente: 1,
  id_finca: 1,
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

  it("exige productor (id_cliente) y finca (id_finca) — spec 004", () => {
    expect(crearLoteSchema.safeParse({ ...loteValido, id_cliente: 0 }).success).toBe(false);
    expect(crearLoteSchema.safeParse({ ...loteValido, id_finca: 0 }).success).toBe(false);
  });

  it("rechaza enproceso fuera de la lista del CHECK", () => {
    const result = crearLoteSchema.safeParse({ ...loteValido, enproceso: "En Secando" });
    expect(result.success).toBe(false);
  });

  it("acepta 'En Catación' como estado válido (0039)", () => {
    expect(crearLoteSchema.safeParse({ ...loteValido, enproceso: "En Catación" }).success).toBe(true);
  });

  it("convierte NaN numérico en null (preproceso nullifyNaN)", () => {
    const result = crearLoteSchema.parse({ ...loteValido, robjetivo: NaN });
    expect(result.robjetivo).toBeNull();
  });

  it("acepta numéricos opcionales vacíos", () => {
    const result = crearLoteSchema.safeParse({ ...loteValido, robjetivo: "", rtotal: null });
    expect(result.success).toBe(true);
  });
});

describe("actualizarLoteSchema", () => {
  it("no permite cambiar nlote (convención CBF: PK-like)", () => {
    const result = actualizarLoteSchema.parse({
      nlote: "LOTE-OTRO",
      id_finca: 2,
    });
    expect(result).not.toHaveProperty("nlote");
    expect(result.id_finca).toBe(2);
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

  it("acepta filtro por id_finca (spec 004)", () => {
    expect(listarLotesFiltrosSchema.safeParse({ id_finca: 3 }).success).toBe(true);
    expect(listarLotesFiltrosSchema.safeParse({ id_finca: 0 }).success).toBe(false);
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
