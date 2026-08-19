import { describe, it, expect } from "vitest";
import { calcularLineaTotal } from "../calculo-precios";

describe("calcularLineaTotal", () => {
  it("calcula correctamente peso * precio_por_kg + precio_empaque", () => {
    expect(calcularLineaTotal({ pesoKg: 10, precioPorKg: 5000, precioEmpaque: 2000 })).toBe(52000);
  });

  it("retorna 0 si todos los valores son null", () => {
    expect(calcularLineaTotal({ pesoKg: null, precioPorKg: null, precioEmpaque: null })).toBe(0);
  });

  it("calcula solo con precio por kg (sin empaque)", () => {
    expect(calcularLineaTotal({ pesoKg: 5, precioPorKg: 3000, precioEmpaque: null })).toBe(15000);
  });

  it("calcula solo con precio de empaque (sin peso/precio kg)", () => {
    expect(calcularLineaTotal({ pesoKg: null, precioPorKg: null, precioEmpaque: 1500 })).toBe(1500);
  });

  it("maneja pesos decimales correctamente", () => {
    expect(calcularLineaTotal({ pesoKg: 2.5, precioPorKg: 4000, precioEmpaque: 500 })).toBe(10500);
  });

  it("maneja undefined como 0", () => {
    expect(calcularLineaTotal({ pesoKg: undefined, precioPorKg: undefined, precioEmpaque: undefined })).toBe(0);
  });

  it("snapshot correcto: peso * precio_por_kg preservado al cambiar precio luego", () => {
    const snapshot1 = calcularLineaTotal({ pesoKg: 10, precioPorKg: 5000, precioEmpaque: 0 });
    const snapshot2 = calcularLineaTotal({ pesoKg: 10, precioPorKg: 6000, precioEmpaque: 0 });
    expect(snapshot1).toBe(50000);
    expect(snapshot2).toBe(60000);
  });
});
