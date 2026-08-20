import { describe, it, expect } from "vitest";
import { intervalosServicioSchema, crearServicioSchema } from "../schemas/servicios-maestro";
import {
  resolverTarifaPorPeso,
  calcularCostoServicio,
  calcularMerma,
} from "../services/resolver-tarifa";
import { calcularLineaTotal } from "../calculo-precios";
import { calcularEmpaques, normalizarCapacidadKg } from "../services/empacado";
import { ordenarPorPrioridadEstable } from "../services/orquestador";

describe("intervalosServicioSchema - validaciones exhaustivas", () => {
  it("rechaza peso_min negativo", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: -1, peso_max_kg: 10, precio_por_kg: 1000 },
    ]);
    expect(result.success).toBe(false);
  });

  it("rechaza peso_max <= peso_min", () => {
    const cases = [
      { peso_min_kg: 10, peso_max_kg: 10, precio_por_kg: 1000 },
      { peso_min_kg: 20, peso_max_kg: 10, precio_por_kg: 1000 },
      { peso_min_kg: 5, peso_max_kg: 0, precio_por_kg: 1000 },
    ];
    for (const intervalo of cases) {
      const result = intervalosServicioSchema.safeParse([intervalo]);
      expect(result.success).toBe(false);
    }
  });

  it("rechaza precio_por_kg 0 y negativo", () => {
    const zero = intervalosServicioSchema.safeParse([
      { peso_min_kg: 1, peso_max_kg: 10, precio_por_kg: 0 },
    ]);
    expect(zero.success).toBe(false);
    const neg = intervalosServicioSchema.safeParse([
      { peso_min_kg: 1, peso_max_kg: 10, precio_por_kg: -100 },
    ]);
    expect(neg.success).toBe(false);
  });

  it("acepta intervalo abierto (max null) solo al final sin solape", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 0, peso_max_kg: 25, precio_por_kg: 2500 },
      { peso_min_kg: 25, peso_max_kg: 100, precio_por_kg: 2200 },
      { peso_min_kg: 100, peso_max_kg: null, precio_por_kg: 1900 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rechaza intervalo abierto que solapa", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 0, peso_max_kg: 50, precio_por_kg: 2500 },
      { peso_min_kg: 30, peso_max_kg: null, precio_por_kg: 1900 },
    ]);
    expect(result.success).toBe(false);
  });

  it("rechaza solape entre intervalos no adyacentes desordenados", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 50, peso_max_kg: 100, precio_por_kg: 900 },
      { peso_min_kg: 1, peso_max_kg: 60, precio_por_kg: 1000 },
      { peso_min_kg: 25, peso_max_kg: 50, precio_por_kg: 950 },
    ]);
    expect(result.success).toBe(false);
  });

  it("acepta intervalos contiguos sin huecos", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 0, peso_max_kg: 10, precio_por_kg: 3000 },
      { peso_min_kg: 10, peso_max_kg: 20, precio_por_kg: 2800 },
      { peso_min_kg: 20, peso_max_kg: 30, precio_por_kg: 2600 },
    ]);
    expect(result.success).toBe(true);
  });

  it("acepta huecos entre intervalos (no solape, no obligación de continuidad)", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 0, peso_max_kg: 10, precio_por_kg: 3000 },
      { peso_min_kg: 20, peso_max_kg: 30, precio_por_kg: 2600 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rechaza lista vacía", () => {
    const result = intervalosServicioSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("valida prioridad y tipo en crearServicioSchema", () => {
    const base = {
      nombre: "Test",
      descripcion: null,
      prioridad: 1,
      tipo: "general" as const,
      activo: true,
      intervalos: [{ peso_min_kg: 0, peso_max_kg: 10, precio_por_kg: 1000 }],
    };
    expect(crearServicioSchema.safeParse(base).success).toBe(true);
    expect(crearServicioSchema.safeParse({ ...base, prioridad: 0 }).success).toBe(false);
    expect(crearServicioSchema.safeParse({ ...base, prioridad: -1 }).success).toBe(false);
    expect(crearServicioSchema.safeParse({ ...base, tipo: "invalido" as any }).success).toBe(false);
    expect(crearServicioSchema.safeParse({ ...base, nombre: "" }).success).toBe(false);
  });
});

describe("resolverTarifaPorPeso - límites inclusivo/exclusivo", () => {
  const tarifas = [
    { id_precio: 1, id_servicio: 1, min_weight_kg: 0, max_weight_kg: 10, precio_por_kg: 3000 },
    { id_precio: 2, id_servicio: 1, min_weight_kg: 10, max_weight_kg: 20, precio_por_kg: 2800 },
    { id_precio: 3, id_servicio: 1, min_weight_kg: 20, max_weight_kg: null, precio_por_kg: 2600 },
  ];

  it("peso en límite inferior inclusivo", () => {
    expect(resolverTarifaPorPeso(tarifas, 0)?.precio_por_kg).toBe(3000);
    expect(resolverTarifaPorPeso(tarifas, 10)?.precio_por_kg).toBe(2800);
    expect(resolverTarifaPorPeso(tarifas, 20)?.precio_por_kg).toBe(2600);
  });

  it("peso justo antes del límite superior va al rango anterior", () => {
    expect(resolverTarifaPorPeso(tarifas, 9.999)?.precio_por_kg).toBe(3000);
    expect(resolverTarifaPorPeso(tarifas, 19.999)?.precio_por_kg).toBe(2800);
  });

  it("peso por debajo del mínimo no resuelve", () => {
    expect(resolverTarifaPorPeso(tarifas, -0.1)).toBeNull();
  });

  it("peso muy grande resuelve al intervalo abierto", () => {
    expect(resolverTarifaPorPeso(tarifas, 1000)?.precio_por_kg).toBe(2600);
  });

  it("lista vacía retorna null", () => {
    expect(resolverTarifaPorPeso([], 10)).toBeNull();
  });

  it("calcularCostoServicio y calcularLineaTotal coherentes", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 5);
    expect(tarifa).not.toBeNull();
    const costo = calcularCostoServicio(5, tarifa!.precio_por_kg);
    expect(costo).toBe(15000);
    expect(calcularLineaTotal({ pesoKg: 5, precioPorKg: tarifa!.precio_por_kg, precioEmpaque: 500 })).toBe(15500);
  });

  it("calcularMerma con borde 0 y porcentajes", () => {
    expect(calcularMerma(10, 8)).toEqual({ mermaKg: 2, porcentaje: 20 });
    expect(calcularMerma(10, 10)).toEqual({ mermaKg: 0, porcentaje: 0 });
    expect(calcularMerma(0, 0)).toEqual({ mermaKg: 0, porcentaje: null });
    expect(calcularMerma(5, 10)).toEqual({ mermaKg: -5, porcentaje: -100 });
  });
});

describe("empacado - bordes", () => {
  it("peso no divisible: ceil correcto", () => {
    expect(calcularEmpaques({ pesoDisponible: 1, capacidadKg: 0.3, precioUnitario: 100 }).cantidad).toBe(4);
    expect(calcularEmpaques({ pesoDisponible: 0.01, capacidadKg: 1, precioUnitario: 100 }).cantidad).toBe(1);
  });

  it("pesoDisponible 0 o negativo retorna 0", () => {
    expect(calcularEmpaques({ pesoDisponible: 0, capacidadKg: 1, precioUnitario: 100 })).toEqual({ cantidad: 0, costoEmpaques: 0 });
    expect(calcularEmpaques({ pesoDisponible: -5, capacidadKg: 1, precioUnitario: 100 })).toEqual({ cantidad: 0, costoEmpaques: 0 });
  });

  it("normaliza gramos y lanza con capacidad inválida", () => {
    expect(normalizarCapacidadKg(500)).toBe(0.5);
    expect(() => calcularEmpaques({ pesoDisponible: 1, capacidadKg: 0, precioUnitario: 100 })).toThrow();
    expect(() => calcularEmpaques({ pesoDisponible: 1, capacidadKg: null as any, precioUnitario: 100 })).toThrow();
  });
});

describe("ordenarPorPrioridadEstable - casos adicionales", () => {
  it("mantiene orden estable con prioridades iguales y ids desordenados", () => {
    const items = [
      { id: 100, prioridad: 5 },
      { id: 10, prioridad: 5 },
      { id: 50, prioridad: 5 },
    ];
    expect(ordenarPorPrioridadEstable(items).map((i) => i.id)).toEqual([10, 50, 100]);
  });

  it("lista vacía y unitaria", () => {
    expect(ordenarPorPrioridadEstable([])).toEqual([]);
    expect(ordenarPorPrioridadEstable([{ id: 1, prioridad: 1 }])).toEqual([{ id: 1, prioridad: 1 }]);
  });
});

describe("calcularLineaTotal - bordes", () => {
  it("NaN y null tratados", () => {
    expect(calcularLineaTotal({ pesoKg: NaN as any, precioPorKg: 1000, precioEmpaque: 0 })).toBeNaN();
    expect(calcularLineaTotal({ pesoKg: null, precioPorKg: null, precioEmpaque: null })).toBe(0);
  });

  it("valores grandes sin overflow", () => {
    expect(calcularLineaTotal({ pesoKg: 1000, precioPorKg: 10000, precioEmpaque: 5000 })).toBe(10005000);
  });
});
