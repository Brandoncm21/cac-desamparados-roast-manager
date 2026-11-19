import { describe, it, expect } from "vitest";
import {
  ESTADOS_LOTE,
  ESTADOS_LOTE_COMERCIAL,
  ESTADOS_ORDEN,
  ESTADOS_PASO,
  NEUTRO,
  resolverEstado,
  type MapaEstados,
} from "../estados";

describe("lib/estados", () => {
  describe("resolverEstado", () => {
    it("debería resolver un estado de orden con su etiqueta y color", () => {
      expect(resolverEstado("En Proceso", "orden")).toEqual({
        label: "En Proceso",
        className: "bg-blue-100 text-blue-800",
      });
    });

    it("debería resolver un estado de lote", () => {
      expect(resolverEstado("Catado", "lote")).toEqual({
        label: "Catado",
        className: "bg-orange-100 text-orange-800",
      });
    });

    it("debería caer al neutro con los estados retirados del flujo viejo", () => {
      expect(resolverEstado("En Catación", "lote")).toEqual({
        label: "En Catación",
        className: NEUTRO.className,
      });
      expect(resolverEstado("No", "lote")).toEqual({
        label: "No",
        className: NEUTRO.className,
      });
    });

    it("debería resolver un estado de paso en mayúsculas a una etiqueta legible", () => {
      expect(resolverEstado("EN_PROCESO", "paso")).toEqual({
        label: "En proceso",
        className: "bg-blue-100 text-blue-800",
      });
    });

    it("debería caer al neutro para un estado desconocido", () => {
      expect(resolverEstado("Inventado", "orden")).toEqual({
        label: "Inventado",
        className: NEUTRO.className,
      });
    });

    it("debería caer al neutro sin etiqueta cuando el estado está vacío", () => {
      expect(resolverEstado("", "orden")).toEqual(NEUTRO);
      expect(resolverEstado(null, "orden")).toEqual(NEUTRO);
      expect(resolverEstado(undefined, "orden")).toEqual(NEUTRO);
    });
  });

  describe("mapas", () => {
    const mapas: Array<[string, MapaEstados]> = [
      ["orden", ESTADOS_ORDEN],
      ["lote", ESTADOS_LOTE],
      ["paso", ESTADOS_PASO],
      ["estado_lote", ESTADOS_LOTE_COMERCIAL],
    ];

    it.each(mapas)("el mapa %s debería tener etiqueta y clase en cada entrada", (_nombre, mapa) => {
      for (const [clave, definicion] of Object.entries(mapa)) {
        expect(clave.length, `clave vacía en ${_nombre}`).toBeGreaterThan(0);
        expect(definicion.label.length, `sin etiqueta: ${clave}`).toBeGreaterThan(0);
        expect(definicion.className.length, `sin clase: ${clave}`).toBeGreaterThan(0);
      }
    });

    it("debería conservar los cuatro estados de orden del dominio", () => {
      expect(Object.keys(ESTADOS_ORDEN).sort()).toEqual(
        ["Cancelado", "Completado", "En Proceso", "Pendiente"].sort()
      );
    });

    it("debería cubrir los estados de lote del flujo Beneficiado (005-006)", () => {
      expect(Object.keys(ESTADOS_LOTE).sort()).toEqual(
        [
          "Recibido",
          "En Caracterización",
          "En Secado",
          "En Bodega",
          "En Trilla",
          "Catado",
          "Calificado",
          "Vendido",
        ].sort()
      );
    });

  it("debería conservar los cuatro estados de paso del dominio", () => {
    expect(Object.keys(ESTADOS_PASO).sort()).toEqual(
      ["COMPLETADO", "EN_PROCESO", "OMITIDO", "PENDIENTE"].sort()
    );
  });

  it("debería tener los tres estados comerciales del lote", () => {
    expect(Object.keys(ESTADOS_LOTE_COMERCIAL).sort()).toEqual(["disponible", "proceso", "vendido"].sort());
  });
  });
});
