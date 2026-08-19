import { describe, it, expect } from "vitest";
import {
  iniciarPasoSchema,
  cerrarGeneralSchema,
  cerrarEmpacadoSchema,
  confirmarTuesteSchema,
} from "../schemas/orden-pasos";
import { resolverTarifaPorPeso, calcularCostoServicio } from "../services/resolver-tarifa";

describe("iniciarPasoSchema", () => {
  it("requiere peso_inicial_kg positivo", () => {
    expect(iniciarPasoSchema.safeParse({ peso_inicial_kg: 10 }).success).toBe(true);
    expect(iniciarPasoSchema.safeParse({ peso_inicial_kg: 0 }).success).toBe(false);
    expect(iniciarPasoSchema.safeParse({}).success).toBe(false);
  });
});

describe("cerrarGeneralSchema", () => {
  it("acepta cierre sin peso final (chancado/trillado)", () => {
    expect(cerrarGeneralSchema.safeParse({}).success).toBe(true);
    expect(cerrarGeneralSchema.safeParse({ observaciones: "" }).success).toBe(true);
  });

  it("acepta peso final opcional", () => {
    expect(cerrarGeneralSchema.safeParse({ peso_final_kg: 9.5 }).success).toBe(true);
    expect(cerrarGeneralSchema.safeParse({ peso_final_kg: null }).success).toBe(true);
  });
});

describe("cerrarEmpacadoSchema", () => {
  it("requiere empaque_id", () => {
    expect(cerrarEmpacadoSchema.safeParse({ empaque_id: 1 }).success).toBe(true);
    expect(cerrarEmpacadoSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza empaque_id inválido", () => {
    expect(cerrarEmpacadoSchema.safeParse({ empaque_id: 0 }).success).toBe(false);
  });
});

describe("confirmarTuesteSchema", () => {
  it("requiere peso_final_kg positivo", () => {
    expect(confirmarTuesteSchema.safeParse({ peso_final_kg: 8 }).success).toBe(true);
    expect(confirmarTuesteSchema.safeParse({ peso_final_kg: 0 }).success).toBe(false);
    expect(confirmarTuesteSchema.safeParse({}).success).toBe(false);
  });
});

describe("cálculo de cobro por intervalo", () => {
  const tarifas = [
    { id_precio: 1, id_servicio: 1, min_weight_kg: 1, max_weight_kg: 25, precio_por_kg: 2500 },
    { id_precio: 2, id_servicio: 1, min_weight_kg: 25, max_weight_kg: 100, precio_por_kg: 2200 },
    { id_precio: 3, id_servicio: 1, min_weight_kg: 100, max_weight_kg: null, precio_por_kg: 1900 },
  ];

  it("calcula subtotal por intervalo usando peso_inicial", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 50);
    expect(tarifa?.precio_por_kg).toBe(2200);
    const subtotal = calcularCostoServicio(50, tarifa!.precio_por_kg);
    expect(subtotal).toBe(110000);
  });

  it("aplica el peso_inicial aunque haya peso_final menor (chancado)", () => {
    // El cobro se basa en el peso de entrada, no en el final.
    const tarifa = resolverTarifaPorPeso(tarifas, 30);
    const subtotal = calcularCostoServicio(30, tarifa!.precio_por_kg);
    expect(subtotal).toBe(66000);
  });

  it("retorna null y no cierra el paso si no hay tarifa para el peso", () => {
    const tarifa = resolverTarifaPorPeso(tarifas, 0);
    expect(tarifa).toBeNull();
  });
});
