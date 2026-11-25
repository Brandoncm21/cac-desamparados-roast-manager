import { describe, it, expect } from "vitest";
import {
  calcularRendimiento,
  totalFacturaOrden,
  totalServicios,
} from "../services/orden-detalle";
import type { PasoFlujo } from "../services/pasos-orden";

describe("lib/services/orden-detalle", () => {
  describe("calcularRendimiento", () => {
    it("debería usar el porcentaje guardado cuando existe", () => {
      expect(
        calcularRendimiento({
          tipo_metrica: "Densidad",
          valor_antes: 100,
          valor_despues: 88,
          porcentaje_diferencia: 12,
        })
      ).toBe("12%");
    });

    it("debería calcular el porcentaje cuando falta el guardado", () => {
      expect(
        calcularRendimiento({
          tipo_metrica: "Peso",
          valor_antes: 10,
          valor_despues: 9,
          porcentaje_diferencia: null,
        })
      ).toBe("10.00%");
    });

    it("debería devolver el marcador si falta alguno de los valores", () => {
      expect(
        calcularRendimiento({
          tipo_metrica: "Peso",
          valor_antes: null,
          valor_despues: 9,
          porcentaje_diferencia: null,
        })
      ).toBe("—");
    });

    it("debería evitar la división por cero", () => {
      expect(
        calcularRendimiento({
          tipo_metrica: "Peso",
          valor_antes: 0,
          valor_despues: 5,
          porcentaje_diferencia: null,
        })
      ).toBe("—");
    });
  });

  describe("totalServicios", () => {
    it("debería preferir line_total sobre precio", () => {
      expect(
        totalServicios([{ linea_total: 1000, precio: 20 }, { linea_total: 500, precio: 10 }])
      ).toBe(1500);
    });

    it("debería caer a precio cuando falta line_total", () => {
      expect(totalServicios([{ linea_total: null, precio: 700 }])).toBe(700);
    });

    it("debería tratar valores serializados como texto", () => {
      expect(
        totalServicios([{ linea_total: "1000.50" as unknown as number, precio: null }])
      ).toBe(1000.5);
    });

    it("debería devolver 0 sin servicios", () => {
      expect(totalServicios([])).toBe(0);
    });

    it("debería ignorar importes nulos", () => {
      expect(totalServicios([{ linea_total: null, precio: null }])).toBe(0);
    });
  });

  describe("totalFacturaOrden", () => {
    const paso = (
      overrides: Partial<Pick<PasoFlujo, "estado" | "costo_total_paso">> = {}
    ): PasoFlujo => ({
      id_paso: 1,
      prioridad: 1,
      estado: "PENDIENTE",
      costo_total_paso: null,
      ...overrides,
    });

    it("debería sumar solo los pasos completados (fuente de verdad)", () => {
      expect(
        totalFacturaOrden({
          servicios_ejecutados: [],
          orden_pasos: [
            paso({ estado: "COMPLETADO", costo_total_paso: 1000 }),
            paso({ estado: "EN_PROCESO", costo_total_paso: 5000 }),
            paso({ estado: "COMPLETADO", costo_total_paso: "250.50" }),
          ],
        })
      ).toBe(1250.5);
    });

    it("debería devolver 0 cuando ningún paso está completado", () => {
      expect(
        totalFacturaOrden({
          servicios_ejecutados: [],
          orden_pasos: [paso({ estado: "PENDIENTE" }), paso({ estado: "OMITIDO" })],
        })
      ).toBe(0);
    });

    it("debería hacer fallback a servicios_ejecutados sin pasos completados", () => {
      expect(
        totalFacturaOrden({
          servicios_ejecutados: [
            { linea_total: 300, precio: 10 },
            { linea_total: null, precio: 200 },
          ],
          orden_pasos: [],
        })
      ).toBe(500);
    });

    it("debería devolver 0 sin pasos ni servicios", () => {
      expect(totalFacturaOrden({ servicios_ejecutados: [], orden_pasos: [] })).toBe(
        0
      );
    });

    it("debería tratar importes nulos y strings sin romper la suma", () => {
      expect(
        totalFacturaOrden({
          servicios_ejecutados: [{ linea_total: null, precio: null }],
          orden_pasos: [paso({ estado: "COMPLETADO", costo_total_paso: null })],
        })
      ).toBe(0);

      expect(
        totalFacturaOrden({
          servicios_ejecutados: [{ linea_total: "100.50", precio: null }],
          orden_pasos: [],
        })
      ).toBe(100.5);
    });
  });
});
