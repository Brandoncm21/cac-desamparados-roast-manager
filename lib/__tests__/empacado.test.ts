import { describe, it, expect } from "vitest";
import { calcularEmpaques, normalizarCapacidadKg } from "../services/empacado";

describe("calcularEmpaques", () => {
  it("calcula unidades para capacidad de 500 g (0.5 kg)", () => {
    const res = calcularEmpaques({
      pesoDisponible: 1,
      capacidadKg: 0.5,
      precioUnitario: 200,
    });
    expect(res.cantidad).toBe(2);
    expect(res.costoEmpaques).toBe(400);
  });

  it("calcula unidades para capacidad de 1 kg", () => {
    const res = calcularEmpaques({
      pesoDisponible: 3,
      capacidadKg: 1,
      precioUnitario: 500,
    });
    expect(res.cantidad).toBe(3);
    expect(res.costoEmpaques).toBe(1500);
  });

  it("calcula ceil correcto con peso no exacto (250 g)", () => {
    const res = calcularEmpaques({
      pesoDisponible: 1,
      capacidadKg: 0.25,
      precioUnitario: 100,
    });
    expect(res.cantidad).toBe(4);
    expect(res.costoEmpaques).toBe(400);
  });

  it("calcula ceil correcto con peso que no llena el último empaque (750 g)", () => {
    const res = calcularEmpaques({
      pesoDisponible: 1.6,
      capacidadKg: 0.75,
      precioUnitario: 300,
    });
    // 1.6 / 0.75 = 2.133... -> 3
    expect(res.cantidad).toBe(3);
    expect(res.costoEmpaques).toBe(900);
  });

  it("retorna 0 unidades cuando el peso disponible es 0", () => {
    const res = calcularEmpaques({
      pesoDisponible: 0,
      capacidadKg: 0.5,
      precioUnitario: 200,
    });
    expect(res.cantidad).toBe(0);
    expect(res.costoEmpaques).toBe(0);
  });

  it("lanza error si la capacidad es 0 o negativa (sin división por cero)", () => {
    expect(() =>
      calcularEmpaques({ pesoDisponible: 1, capacidadKg: 0, precioUnitario: 100 })
    ).toThrow();
    expect(() =>
      calcularEmpaques({ pesoDisponible: 1, capacidadKg: -1, precioUnitario: 100 })
    ).toThrow();
  });

  it("normaliza capacidad en gramos a kg", () => {
    const res = calcularEmpaques({
      pesoDisponible: 1,
      capacidadKg: 500,
      precioUnitario: 200,
    });
    expect(res.cantidad).toBe(2);
    expect(res.costoEmpaques).toBe(400);
  });
});

describe("normalizarCapacidadKg", () => {
  it("convierte gramos a kg", () => {
    expect(normalizarCapacidadKg(250)).toBe(0.25);
    expect(normalizarCapacidadKg(500)).toBe(0.5);
    expect(normalizarCapacidadKg(750)).toBe(0.75);
    expect(normalizarCapacidadKg(1000)).toBe(1);
  });

  it("deja valores en kg sin cambio", () => {
    expect(normalizarCapacidadKg(0.5)).toBe(0.5);
    expect(normalizarCapacidadKg(1)).toBe(1);
    expect(normalizarCapacidadKg(46)).toBe(46);
  });

  it("retorna null para valores inválidos", () => {
    expect(normalizarCapacidadKg(null)).toBeNull();
    expect(normalizarCapacidadKg(undefined)).toBeNull();
    expect(normalizarCapacidadKg(0)).toBeNull();
    expect(normalizarCapacidadKg(-5)).toBeNull();
  });
});
