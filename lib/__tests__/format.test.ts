import { describe, it, expect } from "vitest";
import { formatearColones, formatearPeso, formatearPorcentaje } from "../format";

describe("lib/format", () => {
  describe("formatearColones", () => {
    it("debería anteponer el símbolo y agrupar los miles", () => {
      expect(formatearColones(1500, "en-US")).toBe("₡1,500");
    });

    it("debería formatear el cero como moneda", () => {
      expect(formatearColones(0, "en-US")).toBe("₡0");
    });

    it("debería aceptar números serializados como texto (vienen de NUMERIC)", () => {
      expect(formatearColones("1500.00", "en-US")).toBe("₡1,500");
    });

    it("debería devolver el marcador de ausencia para null, undefined y NaN", () => {
      expect(formatearColones(null)).toBe("—");
      expect(formatearColones(undefined)).toBe("—");
      expect(formatearColones("no-es-numero")).toBe("—");
    });
  });

  describe("formatearPeso", () => {
    it("debería añadir la unidad", () => {
      expect(formatearPeso(12.5)).toBe("12.5 kg");
    });

    it("debería devolver el marcador para valores ausentes", () => {
      expect(formatearPeso(null)).toBe("—");
      expect(formatearPeso(undefined)).toBe("—");
    });
  });

  describe("formatearPorcentaje", () => {
    it("debería añadir el signo de porcentaje", () => {
      expect(formatearPorcentaje(12.5)).toBe("12.5%");
    });

    it("debería devolver el marcador para valores ausentes", () => {
      expect(formatearPorcentaje(null)).toBe("—");
    });
  });
});
