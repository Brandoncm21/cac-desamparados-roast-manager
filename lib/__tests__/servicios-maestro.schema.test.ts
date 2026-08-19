import { describe, it, expect } from "vitest";
import {
  crearServicioSchema,
  crearEmpaqueSchema,
  crearPrecioEmpaqueSchema,
  intervalosServicioSchema,
} from "../schemas/servicios-maestro";
import { resolverTarifaPorPeso } from "../services/resolver-tarifa";

describe("crearServicioSchema", () => {
  const validData = {
    nombre: "Tueste",
    descripcion: "Tostado del café",
    prioridad: 5,
    tipo: "tueste" as const,
    activo: true,
    intervalos: [
      { peso_min_kg: 1, peso_max_kg: 25, precio_por_kg: 2500 },
      { peso_min_kg: 25, peso_max_kg: 100, precio_por_kg: 2200 },
      { peso_min_kg: 100, peso_max_kg: 300, precio_por_kg: 1900 },
    ],
  };

  it("acepta un servicio válido con múltiples intervalos", () => {
    const result = crearServicioSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("acepta un intervalo sin límite superior (max null)", () => {
    const result = crearServicioSchema.safeParse({
      ...validData,
      intervalos: [
        { peso_min_kg: 0, peso_max_kg: 25, precio_por_kg: 2500 },
        { peso_min_kg: 25, peso_max_kg: null, precio_por_kg: 2000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza servicio sin nombre", () => {
    const result = crearServicioSchema.safeParse({ ...validData, nombre: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza servicio sin intervalos", () => {
    const result = crearServicioSchema.safeParse({ ...validData, intervalos: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza servicio sin prioridad", () => {
    const { prioridad, ...rest } = validData;
    const result = crearServicioSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rechaza tipo de servicio inválido", () => {
    const result = crearServicioSchema.safeParse({ ...validData, tipo: "cafe" });
    expect(result.success).toBe(false);
  });

  it("rechaza precio por kg de 0", () => {
    const result = crearServicioSchema.safeParse({
      ...validData,
      intervalos: [{ peso_min_kg: 1, peso_max_kg: 25, precio_por_kg: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza intervalo con peso_min >= peso_max", () => {
    const result = crearServicioSchema.safeParse({
      ...validData,
      intervalos: [{ peso_min_kg: 50, peso_max_kg: 25, precio_por_kg: 1000 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza intervalos solapados", () => {
    const result = crearServicioSchema.safeParse({
      ...validData,
      intervalos: [
        { peso_min_kg: 1, peso_max_kg: 50, precio_por_kg: 1000 },
        { peso_min_kg: 40, peso_max_kg: 100, precio_por_kg: 800 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("acepta intervalos contiguos sin solape (borde compartido)", () => {
    const result = crearServicioSchema.safeParse({
      ...validData,
      intervalos: [
        { peso_min_kg: 1, peso_max_kg: 25, precio_por_kg: 1000 },
        { peso_min_kg: 25, peso_max_kg: 100, precio_por_kg: 800 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("intervalosServicioSchema", () => {
  it("detecta solape entre intervalos no adyacentes", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 1, peso_max_kg: 25, precio_por_kg: 1000 },
      { peso_min_kg: 25, peso_max_kg: 50, precio_por_kg: 900 },
      { peso_min_kg: 30, peso_max_kg: 60, precio_por_kg: 800 },
    ]);
    expect(result.success).toBe(false);
  });

  it("no detecta solape con intervalo sin límite superior al final", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 1, peso_max_kg: 25, precio_por_kg: 1000 },
      { peso_min_kg: 25, peso_max_kg: null, precio_por_kg: 800 },
    ]);
    expect(result.success).toBe(true);
  });

  it("acepta fronteras movidas sin solape (update [1,25],[25,100] -> [1,50],[50,100])", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 1, peso_max_kg: 50, precio_por_kg: 1000 },
      { peso_min_kg: 50, peso_max_kg: 100, precio_por_kg: 900 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rechaza intervalo abierto que solapa a otro acotado", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 1, peso_max_kg: 50, precio_por_kg: 1000 },
      { peso_min_kg: 25, peso_max_kg: null, precio_por_kg: 800 },
    ]);
    expect(result.success).toBe(false);
  });

  it("acepta un único intervalo abierto final", () => {
    const result = intervalosServicioSchema.safeParse([
      { peso_min_kg: 25, peso_max_kg: null, precio_por_kg: 800 },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("resolverTarifaPorPeso", () => {
  const tarifas = [
    { id_precio: 1, id_servicio: 1, min_weight_kg: 1, max_weight_kg: 25, precio_por_kg: 2500 },
    { id_precio: 2, id_servicio: 1, min_weight_kg: 25, max_weight_kg: 100, precio_por_kg: 2200 },
    { id_precio: 3, id_servicio: 1, min_weight_kg: 100, max_weight_kg: null, precio_por_kg: 1900 },
  ];

  it("resuelve tarifa del primer rango", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 10);
    expect(tarifa?.precio_por_kg).toBe(2500);
  });

  it("resuelve tarifa del rango intermedio (borde inferior inclusivo)", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 25);
    expect(tarifa?.precio_por_kg).toBe(2200);
  });

  it("resuelve tarifa del rango sin límite superior", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 250);
    expect(tarifa?.precio_por_kg).toBe(1900);
  });

  it("retorna null si el peso no entra en ningún rango", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 0);
    expect(tarifa).toBeNull();
  });
});

describe("crearEmpaqueSchema", () => {
  it("acepta un empaque válido", () => {
    const result = crearEmpaqueSchema.safeParse({
      nombre: "Bolsa con válvula 1Kg",
      capacidad_kg: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza empaque sin nombre", () => {
    const result = crearEmpaqueSchema.safeParse({ capacidad_kg: 1 });
    expect(result.success).toBe(false);
  });

  it("rechaza precio de empaque negativo", () => {
    const result = crearPrecioEmpaqueSchema.safeParse({ precio: -1 });
    expect(result.success).toBe(false);
  });
});
