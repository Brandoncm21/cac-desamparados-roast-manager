import { describe, it, expect } from "vitest";
import { crearFincaSchema, actualizarFincaSchema } from "@/lib/schemas/fincas";

const base = {
  cliente_id: 1,
  nombre: "Finca La Esperanza",
  altura: 1200,
};

describe("fincas schema (spec 005)", () => {
  it("acepta una finca completa", () => {
    const parsed = crearFincaSchema.safeParse({
      ...base,
      zona_id: 3,
      ubicacion: "2 km al norte de la plaza",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.zona_id).toBe(3);
      expect(parsed.data.altura).toBe(1200);
    }
  });

  it("exige el productor (cliente_id)", () => {
    const sinCliente = crearFincaSchema.safeParse({ nombre: "X", altura: 800 });
    const cero = crearFincaSchema.safeParse({ ...base, cliente_id: 0 });
    expect(sinCliente.success).toBe(false);
    expect(cero.success).toBe(false);
  });

  it("exige el nombre y respeta el máximo de 150", () => {
    const vacio = crearFincaSchema.safeParse({ ...base, nombre: "   " });
    const largo = crearFincaSchema.safeParse({ ...base, nombre: "a".repeat(151) });
    expect(vacio.success).toBe(false);
    expect(largo.success).toBe(false);
    if (!vacio.success) {
      expect(vacio.error.issues.some((i) => /nombre/i.test(i.path.join(".")))).toBe(true);
    }
  });

  it("la altura es opcional (0046) y no admite negativos ni > 4000", () => {
    const sinAltura = crearFincaSchema.safeParse({ cliente_id: 1, nombre: "Sin altura" });
    const nula = crearFincaSchema.safeParse({ ...base, altura: null });
    const negativa = crearFincaSchema.safeParse({ ...base, altura: -5 });
    const excesiva = crearFincaSchema.safeParse({ ...base, altura: 4500 });
    expect(sinAltura.success).toBe(true);
    expect(nula.success).toBe(true);
    expect(negativa.success).toBe(false);
    expect(excesiva.success).toBe(false);
  });

  it("zona y ubicación son opcionales; ubicación acepta '' y máximo 200", () => {
    const sinZona = crearFincaSchema.safeParse({ ...base, zona_id: null, ubicacion: "" });
    const ubicacionLarga = crearFincaSchema.safeParse({ ...base, ubicacion: "x".repeat(201) });
    expect(sinZona.success).toBe(true);
    expect(ubicacionLarga.success).toBe(false);
  });

  it("actualizarFincaSchema acepta cambios parciales", () => {
    expect(actualizarFincaSchema.safeParse({}).success).toBe(true);
    expect(actualizarFincaSchema.safeParse({ altura: 1500 }).success).toBe(true);
    expect(actualizarFincaSchema.safeParse({ nombre: "Nuevo nombre" }).success).toBe(true);
    expect(actualizarFincaSchema.safeParse({ altura: -1 }).success).toBe(false);
  });
});
