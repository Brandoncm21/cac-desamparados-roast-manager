import { describe, expect, it } from "vitest";
import {
  MOLIENDA_DEFAULT,
  requiereHumedad,
  tieneMolido,
  tieneSecado,
  tieneTipoEmpacado,
  tieneTipoTueste,
  type ServicioBasico,
} from "../services/visibilidad";

const CATALOGO: ServicioBasico[] = [
  { nombre: "Chancado", tipo: "general" },
  { nombre: "Trillado", tipo: "general" },
  { nombre: "Clasificación Mecánica", tipo: "general" },
  { nombre: "Clasificación Manual", tipo: "general" },
  { nombre: "Tueste", tipo: "tueste" },
  { nombre: "Molido", tipo: "general" },
  { nombre: "Empacado", tipo: "empacado" },
];

describe("visibilidad de secciones por servicios seleccionados", () => {
  it("detecta tueste por tipo y por nombre", () => {
    expect(tieneTipoTueste([{ nombre: "Tueste", tipo: "tueste" }])).toBe(true);
    expect(tieneTipoTueste([{ nombre: "Tueste artesanal", tipo: "general" }])).toBe(true);
    expect(tieneTipoTueste([{ nombre: "Molido", tipo: "general" }])).toBe(false);
    expect(tieneTipoTueste([])).toBe(false);
  });

  it("detecta empacado por tipo y por nombre", () => {
    expect(tieneTipoEmpacado([{ nombre: "Empacado", tipo: "empacado" }])).toBe(true);
    expect(tieneTipoEmpacado([{ nombre: "Empaque especial", tipo: "general" }])).toBe(true);
    expect(tieneTipoEmpacado([{ nombre: "Tueste", tipo: "tueste" }])).toBe(false);
    expect(tieneTipoEmpacado([])).toBe(false);
  });

  it("detecta molido por nombre sin importar mayúsculas", () => {
    expect(tieneMolido([{ nombre: "Molido", tipo: "general" }])).toBe(true);
    expect(tieneMolido([{ nombre: "molido fino", tipo: "general" }])).toBe(true);
    expect(tieneMolido([{ nombre: "Tueste", tipo: "tueste" }])).toBe(false);
    expect(tieneMolido([])).toBe(false);
  });

  it("clasificación manual no se confunde con molido", () => {
    expect(tieneMolido(CATALOGO.filter((s) => s.nombre === "Clasificación Manual"))).toBe(false);
  });

  it("requiere humedad para tueste y secado, no para el resto", () => {
    expect(requiereHumedad([{ nombre: "Tueste", tipo: "tueste" }])).toBe(true);
    expect(requiereHumedad([{ nombre: "Secado", tipo: "general" }])).toBe(true);
    expect(requiereHumedad([{ nombre: "Secado natural", tipo: "general" }])).toBe(true);
    expect(requiereHumedad([{ nombre: "Empacado", tipo: "empacado" }])).toBe(false);
    expect(requiereHumedad([{ nombre: "Chancado", tipo: "general" }])).toBe(false);
    expect(requiereHumedad([])).toBe(false);
  });

  it("detecta secado por nombre con y sin acentos", () => {
    expect(tieneSecado([{ nombre: "Secado", tipo: "general" }])).toBe(true);
    expect(tieneSecado([{ nombre: "Trillado", tipo: "general" }])).toBe(false);
  });

  it("la molienda por defecto del tueste es Grano Entero", () => {
    expect(MOLIENDA_DEFAULT).toBe("Grano Entero");
  });
});
