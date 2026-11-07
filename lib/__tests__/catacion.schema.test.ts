import { describe, it, expect } from "vitest";
import {
  catacionSchema,
  rondaSchema,
  guardarCatacionBodySchema,
  enviarProcesoBodySchema,
} from "@/lib/schemas/catacion";

const base = {
  perfil_tueste_ref: "2cf080bd-b429-4df4-994e-54d1640cb922",
};

describe("catacion schema (48 campos + rondas)", () => {
  it("acepta catación con payload mínimo y al menos una ronda", () => {
    const parsed = guardarCatacionBodySchema.safeParse({
      catacion: { ...base, pfinales: "84.5" },
      rondas: [{ valor_calidad: "86" }, { valor_calidad: 87.5 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.catacion.pfinales).toBe(84.5);
      expect(parsed.data.catacion.producto_analizado).toBe("tueste");
      expect(parsed.data.rondas).toHaveLength(2);
    }
  });

  it("exige perfil_tueste_ref válido (e2)", () => {
    const parsed = catacionSchema.safeParse({ pfinales: "80" });
    expect(parsed.success).toBe(false);
  });

  it("rechaza pfinales fuera de 0-100", () => {
    const parsed = catacionSchema.safeParse({ ...base, pfinales: "120" });
    expect(parsed.success).toBe(false);
  });

  it("normaliza '' y NaN a null en campos físico-químicos", () => {
    const parsed = catacionSchema.safeParse({
      ...base,
      limpio: "",
      dfueste: Number.NaN,
      c2cortado: "0.5",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limpio).toBeNull();
      expect(parsed.data.dfueste).toBeNull();
      expect(parsed.data.c2cortado).toBe(0.5);
    }
  });

  it("disp. 2: c2cortado/c2negrop/c2agriop son campos normales", () => {
    const parsed = catacionSchema.safeParse({
      ...base,
      c2cortado: "1",
      c2negrop: "2",
      c2agriop: "3",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.c2cortado).toBe(1);
      expect(parsed.data.c2negrop).toBe(2);
      expect(parsed.data.c2agriop).toBe(3);
    }
  });

  it("rondas: valor_calidad 0-100 y normaliza vacíos", () => {
    const ok = rondaSchema.safeParse({ valor_calidad: "90.5" });
    const fuera = rondaSchema.safeParse({ valor_calidad: "150" });
    expect(ok.success).toBe(true);
    expect(fuera.success).toBe(false);
  });

  it("rechaza body sin rondas (mínimo 1)", () => {
    const parsed = guardarCatacionBodySchema.safeParse({
      catacion: { ...base, pfinales: "80" },
      rondas: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("e1: id_trilla numérico positivo requerido", () => {
    const ok = enviarProcesoBodySchema.safeParse({ id_trilla: 4 });
    const vacio = enviarProcesoBodySchema.safeParse({ id_trilla: "" });
    const negativo = enviarProcesoBodySchema.safeParse({ id_trilla: -2 });
    expect(ok.success).toBe(true);
    expect(vacio.success).toBe(false);
    expect(negativo.success).toBe(false);
  });
});
