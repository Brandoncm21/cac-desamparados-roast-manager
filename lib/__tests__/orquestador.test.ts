import { describe, it, expect } from "vitest";
import { ordenarPorPrioridadEstable } from "../services/orquestador";

interface Item {
  id: number;
  prioridad: number;
  nombre: string;
}

describe("ordenarPorPrioridadEstable", () => {
  it("ordena por prioridad ascendente", () => {
    const items: Item[] = [
      { id: 1, prioridad: 5, nombre: "Tueste" },
      { id: 2, prioridad: 1, nombre: "Chancado" },
      { id: 3, prioridad: 3, nombre: "Trillado" },
    ];
    const ordenados = ordenarPorPrioridadEstable(items);
    expect(ordenados.map((i) => i.nombre)).toEqual(["Chancado", "Trillado", "Tueste"]);
  });

  it("desempata de forma estable por id cuando hay prioridades duplicadas", () => {
    const items: Item[] = [
      { id: 10, prioridad: 2, nombre: "Servicio B" },
      { id: 5, prioridad: 2, nombre: "Servicio A" },
      { id: 1, prioridad: 1, nombre: "Primero" },
    ];
    const ordenados = ordenarPorPrioridadEstable(items);
    expect(ordenados.map((i) => i.nombre)).toEqual(["Primero", "Servicio A", "Servicio B"]);
  });

  it("no muta el arreglo original", () => {
    const items: Item[] = [
      { id: 2, prioridad: 2, nombre: "B" },
      { id: 1, prioridad: 1, nombre: "A" },
    ];
    const original = [...items];
    ordenarPorPrioridadEstable(items);
    expect(items).toEqual(original);
  });

  it("es determinista con prioridades idénticas", () => {
    const items: Item[] = [
      { id: 3, prioridad: 1, nombre: "C" },
      { id: 1, prioridad: 1, nombre: "A" },
      { id: 2, prioridad: 1, nombre: "B" },
    ];
    const ordenados = ordenarPorPrioridadEstable(items);
    expect(ordenados.map((i) => i.nombre)).toEqual(["A", "B", "C"]);
  });
});
