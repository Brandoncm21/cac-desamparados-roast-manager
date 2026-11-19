import { describe, it, expect } from "vitest";
import {
  calificacionSchema,
  guardarCalificacionSchema,
  ESTADOS_BENEFICIO,
  ETAPAS_BENEFICIO,
  ETAPA_SCHEMAS,
} from "../schemas/beneficio";

describe("calificación (verde y tostado)", () => {
  it("acepta un formulario vacío: todos los campos son opcionales", () => {
    expect(calificacionSchema.safeParse({}).success).toBe(true);
  });

  it("exige el lote al guardar", () => {
    expect(guardarCalificacionSchema.safeParse({}).success).toBe(false);
    expect(guardarCalificacionSchema.safeParse({ id_lote: 3 }).success).toBe(true);
  });

  it("valida los rangos del bloque verde", () => {
    expect(calificacionSchema.safeParse({ humedad: 101 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ humedad: -1 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ densidad: 0 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ defectos_primarios: -2 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ porcentaje_verde: 120 }).success).toBe(false);
  });

  it("valida el puntaje SCA y los atributos 1-10", () => {
    expect(calificacionSchema.safeParse({ humedad: 11, puntaje_sca: 80.5 }).success).toBe(true);
    expect(calificacionSchema.safeParse({ humedad: 11, puntaje_sca: 101 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ humedad: 11, acidez: 11 }).success).toBe(false);
    expect(calificacionSchema.safeParse({ humedad: 11, acidez: 1 }).success).toBe(true);
  });

  it("exige el verde antes de calificar el tostado", () => {
    const sinVerde = calificacionSchema.safeParse({ puntaje_sca: 85 });
    expect(sinVerde.success).toBe(false);
    if (!sinVerde.success) {
      expect(sinVerde.error.issues.some((i) => /café verde|humedad/i.test(i.message))).toBe(true);
    }
  });

  it("normaliza los campos numéricos vacíos a null", () => {
    const parsed = calificacionSchema.safeParse({
      humedad: "",
      densidad: Number.NaN,
      notas: "  bueno  ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.humedad).toBeNull();
      expect(parsed.data.densidad).toBeNull();
      expect(parsed.data.notas).toBe("bueno");
    }
  });

  it("incluye el estado Calificado y la etapa calificacion", () => {
    expect(ESTADOS_BENEFICIO).toContain("Calificado");
    expect(ETAPAS_BENEFICIO).toContain("calificacion");
    expect(ETAPA_SCHEMAS.calificacion).toBe(calificacionSchema);
  });
});
