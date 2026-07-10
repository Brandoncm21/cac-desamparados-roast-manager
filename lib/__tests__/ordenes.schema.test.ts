import { describe, it, expect } from "vitest";
import { crearOrdenSchema, actualizarOrdenSchema } from "../schemas/ordenes";

describe("crearOrdenSchema", () => {
  const validData = {
    id_cliente: 1,
    zona_finca: "Zona Alta",
    descripcion_producto: "Café arábica",
    proceso_cafe: "Lavado",
    porcentaje_humedad_entrada: 12.5,
    id_empleado_recibe: 2,
    servicios: [{ tipo_servicio: "Tueste", peso_inicial: 50, precio: 100 }],
    tipo_tueste: "Medio",
    tipo_molienda: "Media",
    tipo_empaque: "Bolsa con válvula 1Kg",
    observaciones: "Observación de prueba",
  };

  it("acepta una orden válida completa", () => {
    const result = crearOrdenSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("acepta campos opcionales vacíos como string vacío o null", () => {
    const result = crearOrdenSchema.safeParse({
      ...validData,
      tipo_tueste: null,
      tipo_molienda: "",
      tipo_empaque: null,
      zona_finca: "",
      observaciones: "",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza id_cliente menor o igual a cero", () => {
    const result = crearOrdenSchema.safeParse({ ...validData, id_cliente: 0 });
    expect(result.success).toBe(false);
  });

  it("rechaza id_empleado_recibe faltante", () => {
    const { id_empleado_recibe, ...rest } = validData;
    const result = crearOrdenSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rechaza lista de servicios vacía", () => {
    const result = crearOrdenSchema.safeParse({ ...validData, servicios: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza servicio con tipo_servicio inválido", () => {
    const result = crearOrdenSchema.safeParse({
      ...validData,
      servicios: [{ tipo_servicio: "Servicio inválido" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("actualizarOrdenSchema", () => {
  it("acepta actualización parcial", () => {
    const result = actualizarOrdenSchema.safeParse({
      zona_finca: "Nueva zona",
      estado_orden: "En Proceso",
    });
    expect(result.success).toBe(true);
  });

  it("acepta objeto vacío", () => {
    const result = actualizarOrdenSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
