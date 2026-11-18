import { describe, it, expect } from "vitest";
import { catacionSchema, enviarProcesoBodySchema } from "@/lib/schemas/catacion";

describe("catacion schema (mínima: lote + catado + notas)", () => {
  it("acepta el payload mínimo con solo el lote", () => {
    const parsed = catacionSchema.safeParse({ id_lote: 7 });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id_lote).toBe(7);
      expect(parsed.data.catado).toBe(false);
    }
  });

  it("rechaza una catación sin lote", () => {
    const parsed = catacionSchema.safeParse({});

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => /lote/i.test(i.message))).toBe(true);
    }
  });

  it("rechaza id_lote cero, negativo o decimal", () => {
    expect(catacionSchema.safeParse({ id_lote: 0 }).success).toBe(false);
    expect(catacionSchema.safeParse({ id_lote: -3 }).success).toBe(false);
    expect(catacionSchema.safeParse({ id_lote: 1.5 }).success).toBe(false);
  });

  it("rechaza id_lote enviado como texto", () => {
    expect(catacionSchema.safeParse({ id_lote: "7" }).success).toBe(false);
  });

  it("respeta catado en true y en false", () => {
    const si = catacionSchema.safeParse({ id_lote: 7, catado: true });
    const no = catacionSchema.safeParse({ id_lote: 7, catado: false });

    expect(si.success && si.data.catado).toBe(true);
    expect(no.success && no.data.catado).toBe(false);
  });

  it("normaliza las notas vacías y recorta espacios", () => {
    const vacia = catacionSchema.safeParse({ id_lote: 7, notas_catacion: "   " });
    const texto = catacionSchema.safeParse({ id_lote: 7, notas_catacion: "  bueno  " });

    expect(vacia.success && vacia.data.notas_catacion).toBeNull();
    expect(texto.success && texto.data.notas_catacion).toBe("bueno");
  });

  it("rechaza notas de más de 2000 caracteres", () => {
    const parsed = catacionSchema.safeParse({ id_lote: 7, notas_catacion: "x".repeat(2001) });

    expect(parsed.success).toBe(false);
  });

  it("acepta el id de catación para editar", () => {
    const parsed = catacionSchema.safeParse({ id_catacion_tueste: 12, id_lote: 7, catado: true });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.id_catacion_tueste).toBe(12);
  });

  it("descarta los atributos heredados que ya no existen", () => {
    const parsed = catacionSchema.safeParse({
      id_lote: 7,
      pfinales: 84.5,
      limpio: 99,
      perfil_tueste_ref: "2cf080bd-b429-4df4-994e-54d1640cb922",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ id_lote: 7, catado: false, notas_catacion: null });
    }
  });

  it("e1: id_trilla numérico positivo requerido", () => {
    expect(enviarProcesoBodySchema.safeParse({ id_trilla: 4 }).success).toBe(true);
    expect(enviarProcesoBodySchema.safeParse({ id_trilla: "" }).success).toBe(false);
    expect(enviarProcesoBodySchema.safeParse({ id_trilla: -2 }).success).toBe(false);
  });
});
