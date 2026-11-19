import { describe, it, expect } from "vitest";
import {
  calificacionSchema,
  guardarCalificacionSchema,
  ESTADOS_BENEFICIO,
  ETAPAS_BENEFICIO,
  ETAPA_SCHEMAS,
} from "../schemas/beneficio";
import {
  calcularTotales,
  sugerirGradoTostado,
  sugerirGradoVerde,
} from "../services/calificacion";

describe("hoja de calificación (verde y tostado)", () => {
  it("acepta un formulario vacío y deja defectos vacíos", () => {
    const parsed = calificacionSchema.parse({});
    expect(parsed.defectos).toEqual([]);
  });

  it("exige el lote al guardar", () => {
    expect(guardarCalificacionSchema.safeParse({}).success).toBe(false);
    expect(guardarCalificacionSchema.safeParse({ id_lote: 3 }).success).toBe(true);
  });

  it("valida humedad, conteos y campos opcionales", () => {
    expect(calificacionSchema.safeParse({ humedad: 101 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ humedad: -1 }).success).toBe(false);
    expect(
      calificacionSchema.safeParse({
        defectos: [{ id_defecto: 1, numero_defectos: -1 }],
      }).success
    ).toBe(false);
    expect(
      calificacionSchema.safeParse({
        defectos: [{ id_defecto: 1, numero_defectos: "" }],
      }).success
    ).toBe(true);
  });

  it("acepta colores, olores, grados y código tostado opcional", () => {
    const parsed = calificacionSchema.parse({
      color: "Amarillo",
      olor: "Limpio",
      grado: "Specialty",
      grado_tostado: "Premium",
      codigo_muestra_tostado: null,
    });
    expect(parsed.color).toBe("Amarillo");
    expect(parsed.codigo_muestra_tostado).toBeNull();
    expect(calificacionSchema.safeParse({ color: "Morado" }).success).toBe(false);
    expect(calificacionSchema.safeParse({ grado: "Oro" }).success).toBe(false);
  });

  it("calcula totales y sugiere grados", () => {
    const totales = calcularTotales([
      { id_defecto: 1, categoria: 1, proporcion: 1, numero_defectos: 0 },
      { id_defecto: 7, categoria: 2, proporcion: 3, numero_defectos: 6 },
      { id_defecto: 9, categoria: 2, proporcion: 5, numero_defectos: 10 },
    ]);
    expect(totales.totalDefectos).toBe(16);
    expect(totales.totalEquivalencia).toBe(4);
    expect(totales.cat1Defectos).toBe(0);
    expect(sugerirGradoVerde(totales.totalEquivalencia, totales.cat1Defectos)).toBe("Specialty");
    expect(sugerirGradoVerde(8, 1)).toBe("Premium");
    expect(sugerirGradoVerde(23, 1)).toBe("Exchange");
    expect(sugerirGradoVerde(24, 1)).toBe("Below Standard");
  });

  it("sugiere grado tostado por quakers", () => {
    expect(sugerirGradoTostado(0)).toBe("Specialty");
    expect(sugerirGradoTostado(3)).toBe("Premium");
    expect(sugerirGradoTostado(4)).toBe("Exchange");
    expect(sugerirGradoTostado(null)).toBe("Specialty");
  });

  it("incluye el estado Calificado y la etapa calificacion", () => {
    expect(ESTADOS_BENEFICIO).toContain("Calificado");
    expect(ETAPAS_BENEFICIO).toContain("calificacion");
    expect(ETAPA_SCHEMAS.calificacion).toBe(calificacionSchema);
  });
});
