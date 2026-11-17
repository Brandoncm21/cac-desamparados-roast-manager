import { describe, it, expect } from "vitest";
import {
  calcularTotalAcumulado,
  mensajeExitoPaso,
  prepararEnvioPaso,
  seleccionarPasoActual,
  type PasoFlujo,
} from "../services/pasos-orden";

function paso(overrides: Partial<PasoFlujo> = {}): PasoFlujo {
  return {
    id_paso: 1,
    prioridad: 1,
    estado: "PENDIENTE",
    costo_total_paso: null,
    ...overrides,
  };
}

describe("lib/services/pasos-orden", () => {
  describe("seleccionarPasoActual", () => {
    it("debería devolver null sin pasos", () => {
      expect(seleccionarPasoActual([])).toBeNull();
    });

    it("debería elegir el primer paso ni completado ni omitido", () => {
      const pasos = [
        paso({ id_paso: 1, prioridad: 1, estado: "COMPLETADO" }),
        paso({ id_paso: 2, prioridad: 2, estado: "EN_PROCESO" }),
        paso({ id_paso: 3, prioridad: 3, estado: "PENDIENTE" }),
      ];

      expect(seleccionarPasoActual(pasos)?.id_paso).toBe(2);
    });

    it("debería ordenar por prioridad y desempatar por id", () => {
      const pasos = [
        paso({ id_paso: 9, prioridad: 2 }),
        paso({ id_paso: 4, prioridad: 2 }),
        paso({ id_paso: 7, prioridad: 1 }),
      ];

      expect(seleccionarPasoActual(pasos)?.id_paso).toBe(7);
    });

    it("debería desempatar por id cuando la prioridad coincide", () => {
      const pasos = [
        paso({ id_paso: 9, prioridad: 1 }),
        paso({ id_paso: 4, prioridad: 1 }),
      ];

      expect(seleccionarPasoActual(pasos)?.id_paso).toBe(4);
    });

    it("debería devolver null si todos están completados u omitidos", () => {
      const pasos = [
        paso({ id_paso: 1, estado: "COMPLETADO" }),
        paso({ id_paso: 2, estado: "OMITIDO" }),
      ];

      expect(seleccionarPasoActual(pasos)).toBeNull();
    });

    it("no debería mutar el arreglo recibido", () => {
      const pasos = [paso({ id_paso: 9, prioridad: 2 }), paso({ id_paso: 4, prioridad: 1 })];
      const copia = [...pasos];

      seleccionarPasoActual(pasos);

      expect(pasos).toEqual(copia);
    });
  });

  describe("calcularTotalAcumulado", () => {
    it("debería sumar solo los pasos completados", () => {
      const pasos = [
        paso({ id_paso: 1, estado: "COMPLETADO", costo_total_paso: 1000 }),
        paso({ id_paso: 2, estado: "EN_PROCESO", costo_total_paso: 5000 }),
        paso({ id_paso: 3, estado: "COMPLETADO", costo_total_paso: "250.50" as unknown as number }),
      ];

      expect(calcularTotalAcumulado(pasos)).toBe(1250.5);
    });

    it("debería devolver 0 sin pasos completados", () => {
      expect(calcularTotalAcumulado([paso({ estado: "PENDIENTE" })])).toBe(0);
      expect(calcularTotalAcumulado([])).toBe(0);
    });

    it("debería ignorar costos nulos", () => {
      const pasos = [paso({ estado: "COMPLETADO", costo_total_paso: null })];
      expect(calcularTotalAcumulado(pasos)).toBe(0);
    });
  });

  describe("prepararEnvioPaso", () => {
    const base = { esEmpacado: false, peso: "", empaqueId: "", observaciones: "" };

    it("debería exigir peso al iniciar", () => {
      expect(prepararEnvioPaso({ ...base, accion: "iniciar" })).toEqual({
        ok: false,
        error: "Ingrese un peso inicial válido",
      });
    });

    it("debería rechazar un peso no numérico al iniciar", () => {
      expect(prepararEnvioPaso({ ...base, accion: "iniciar", peso: "abc" })).toEqual({
        ok: false,
        error: "Ingrese un peso inicial válido",
      });
    });

    it("debería armar el cuerpo de inicio con el peso numérico", () => {
      expect(prepararEnvioPaso({ ...base, accion: "iniciar", peso: "12.5" })).toEqual({
        ok: true,
        sufijo: "iniciar",
        body: { peso_inicial_kg: 12.5 },
      });
    });

    it("debería exigir empaque al cerrar un paso de empacado", () => {
      expect(
        prepararEnvioPaso({ ...base, accion: "cerrar", esEmpacado: true })
      ).toEqual({ ok: false, error: "Seleccione un empaque" });
    });

    it("debería armar el cierre de empacado con empaque y observaciones", () => {
      expect(
        prepararEnvioPaso({
          accion: "cerrar",
          esEmpacado: true,
          peso: "",
          empaqueId: "3",
          observaciones: "ok",
        })
      ).toEqual({
        ok: true,
        sufijo: "cerrar",
        body: { empaque_id: 3, observaciones: "ok" },
      });
    });

    it("debería enviar observaciones nulas cuando están vacías", () => {
      expect(
        prepararEnvioPaso({
          accion: "cerrar",
          esEmpacado: true,
          peso: "",
          empaqueId: "3",
          observaciones: "   ",
        })
      ).toEqual({
        ok: true,
        sufijo: "cerrar",
        body: { empaque_id: 3, observaciones: null },
      });
    });

    it("debería permitir cerrar sin peso final (opcional)", () => {
      expect(prepararEnvioPaso({ ...base, accion: "cerrar" })).toEqual({
        ok: true,
        sufijo: "cerrar",
        body: { peso_final_kg: null, observaciones: null },
      });
    });

    it("debería rechazar un peso final inválido al cerrar", () => {
      expect(prepararEnvioPaso({ ...base, accion: "cerrar", peso: "-2" })).toEqual({
        ok: false,
        error: "El peso final debe ser un número válido",
      });
    });

    it("debería exigir peso final al confirmar tueste", () => {
      expect(prepararEnvioPaso({ ...base, accion: "confirmar-tueste" })).toEqual({
        ok: false,
        error: "Ingrese un peso final válido",
      });
    });

    it("debería armar la confirmación de tueste", () => {
      expect(
        prepararEnvioPaso({
          accion: "confirmar-tueste",
          esEmpacado: false,
          peso: "10",
          empaqueId: "",
          observaciones: "",
        })
      ).toEqual({
        ok: true,
        sufijo: "confirmar-tueste",
        body: { peso_final_kg: 10, observaciones: null },
      });
    });
  });

  describe("mensajeExitoPaso", () => {
    it("debería describir cada acción", () => {
      expect(mensajeExitoPaso("iniciar")).toBe("Paso iniciado");
      expect(mensajeExitoPaso("cerrar")).toBe("Paso completado");
      expect(mensajeExitoPaso("confirmar-tueste")).toBe("Tueste confirmado");
    });
  });
});
