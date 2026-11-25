import { describe, it, expect } from "vitest";
import { crearProductorSchema } from "@/lib/schemas/productores";

describe("productores schema", () => {
  it("acepta nombre y teléfono válidos", () => {
    const parsed = crearProductorSchema.safeParse({
      nombre_completo: "María Rodríguez",
      telefono: "8888-8888",
    });
    expect(parsed.success).toBe(true);
  });

  it("normaliza espacios en nombre y teléfono", () => {
    const parsed = crearProductorSchema.safeParse({
      nombre_completo: "  Ana Mora  ",
      telefono: "  +506 8888-8888  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.nombre_completo).toBe("Ana Mora");
      expect(parsed.data.telefono).toBe("+506 8888-8888");
    }
  });

  it("exige el nombre y respeta el máximo de 150", () => {
    const vacio = crearProductorSchema.safeParse({ nombre_completo: "   " });
    const largo = crearProductorSchema.safeParse({
      nombre_completo: "a".repeat(151),
    });
    expect(vacio.success).toBe(false);
    expect(largo.success).toBe(false);
    if (!vacio.success) {
      expect(vacio.error.issues.some((i) => i.path.join(".") === "nombre_completo")).toBe(true);
    }
  });

  it("el teléfono es opcional: ausente, null o vacío son válidos", () => {
    expect(crearProductorSchema.safeParse({ nombre_completo: "Ana" }).success).toBe(true);
    expect(
      crearProductorSchema.safeParse({ nombre_completo: "Ana", telefono: null }).success
    ).toBe(true);
    expect(
      crearProductorSchema.safeParse({ nombre_completo: "Ana", telefono: "" }).success
    ).toBe(true);
  });

  it("rechaza un teléfono con formato inválido", () => {
    const parsed = crearProductorSchema.safeParse({
      nombre_completo: "Ana",
      telefono: "llamar luego",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join(".") === "telefono")).toBe(true);
    }
  });

  it("rechaza un teléfono con más de 30 caracteres", () => {
    const parsed = crearProductorSchema.safeParse({
      nombre_completo: "Ana",
      telefono: "+" + "1".repeat(30),
    });
    expect(parsed.success).toBe(false);
  });
});
