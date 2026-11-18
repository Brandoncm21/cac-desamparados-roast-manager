import { describe, it, expect } from "vitest";
import {
  calcularPorcentajesMaduracion,
  esEtapaEditable,
  porcentajeDe,
  promedioBx,
  siguienteEstado,
} from "../services/beneficio";
import {
  caracterizacionSchema,
  catacionSchema,
  crearRecibidoSchema,
  secadoSchema,
  trillaSchema,
} from "../schemas/beneficio";
import { statusDeCodigoPg } from "../api-helpers";

describe("calcularPorcentajesMaduracion", () => {
  it("reparte 100% entre los cinco estados", () => {
    const r = calcularPorcentajesMaduracion({
      cerezas_verdes: 10,
      cerezas_semimaduras: 20,
      cerezas_en_objetivo: 50,
      cerezas_sobremaduras: 15,
      cerezas_secas: 5,
    });

    expect(r.cerezas_en_objetivo).toBe(50);
    expect(r.cerezas_verdes).toBe(10);
    expect(r.cerezas_secas).toBe(5);
  });

  it("redondea a un decimal", () => {
    const r = calcularPorcentajesMaduracion({
      cerezas_verdes: 1,
      cerezas_semimaduras: 1,
      cerezas_en_objetivo: 1,
    });
    expect(r.cerezas_verdes).toBe(33.3);
  });

  it("devuelve ceros cuando no hay conteos", () => {
    const r = calcularPorcentajesMaduracion({});
    expect(r.cerezas_en_objetivo).toBe(0);
    expect(r.cerezas_verdes).toBe(0);
  });

  it("ignora valores nulos", () => {
    const r = calcularPorcentajesMaduracion({
      cerezas_verdes: null,
      cerezas_en_objetivo: 10,
    });
    expect(r.cerezas_en_objetivo).toBe(100);
    expect(r.cerezas_verdes).toBe(0);
  });
});

describe("promedioBx", () => {
  it("promedia las lecturas válidas", () => {
    expect(promedioBx([20, 22, 21])).toBe(21);
  });

  it("descarta nulos y redondea a 2 decimales", () => {
    expect(promedioBx([20, null, 21, undefined])).toBe(20.5);
    expect(promedioBx([1, 2, 2])).toBe(1.67);
  });

  it("devuelve null sin lecturas", () => {
    expect(promedioBx([])).toBeNull();
    expect(promedioBx([null, undefined])).toBeNull();
  });
});

describe("siguienteEstado", () => {
  it("avanza en la secuencia del beneficio", () => {
    expect(siguienteEstado("Recibido")).toBe("En Caracterización");
    expect(siguienteEstado("En Trilla")).toBe("Catado");
  });

  it("no avanza desde el final o estados desconocidos", () => {
    expect(siguienteEstado("Catado")).toBeNull();
    expect(siguienteEstado("Vendido")).toBeNull();
    expect(siguienteEstado("Otro")).toBeNull();
    expect(siguienteEstado(null)).toBeNull();
  });
});

describe("esEtapaEditable", () => {
  it("bloquea solo los lotes vendidos", () => {
    expect(esEtapaEditable("Vendido")).toBe(false);
    expect(esEtapaEditable("Catado")).toBe(true);
    expect(esEtapaEditable(null)).toBe(true);
  });
});

describe("porcentajeDe", () => {
  it("calcula el porcentaje de una parte", () => {
    expect(porcentajeDe(25, 200)).toBe(12.5);
  });

  it("devuelve null si el total no sirve", () => {
    expect(porcentajeDe(10, 0)).toBeNull();
    expect(porcentajeDe(null, 10)).toBeNull();
  });
});

describe("crearRecibidoSchema", () => {
  const base = {
    numero_lote: "L-2026-001",
    numero_recibo: "R-100",
    productor_id: 1,
    finca_id: 2,
  };

  it("acepta lo mínimo y aplica defaults", () => {
    const parsed = crearRecibidoSchema.parse(base);
    expect(parsed.puro_impuro).toBe(true);
    expect(parsed.limpio_sucio).toBe(true);
    expect(parsed.proceso).toBeUndefined();
  });

  it("normaliza porcentajes vacíos a null", () => {
    const parsed = crearRecibidoSchema.parse({ ...base, porcentaje_flote: "" });
    expect(parsed.porcentaje_flote).toBeNull();
  });

  it("rechaza pH fuera de 0–14 y porcentajes fuera de 0–100", () => {
    expect(crearRecibidoSchema.safeParse({ ...base, ph_miel: 15 }).success).toBe(false);
    expect(
      crearRecibidoSchema.safeParse({ ...base, porcentaje_broca: 101 }).success
    ).toBe(false);
  });

  it("exige lote, recibo, productor y finca", () => {
    expect(crearRecibidoSchema.safeParse({}).success).toBe(false);
    expect(crearRecibidoSchema.safeParse({ ...base, numero_lote: "" }).success).toBe(false);
    expect(crearRecibidoSchema.safeParse({ ...base, productor_id: 0 }).success).toBe(false);
  });
});

describe("secadoSchema", () => {
  it("rechaza finalización anterior al inicio", () => {
    const r = secadoSchema.safeParse({
      fecha_inicio_secado: "2026-01-10",
      fecha_finalizacion_secado: "2026-01-05",
    });
    expect(r.success).toBe(false);
  });

  it("acepta un rango de fechas coherente", () => {
    const r = secadoSchema.safeParse({
      fecha_inicio_secado: "2026-01-05",
      fecha_finalizacion_secado: "2026-01-10",
    });
    expect(r.success).toBe(true);
  });
});

describe("trillaSchema", () => {
  it("exige el peso en verde final", () => {
    expect(trillaSchema.safeParse({}).success).toBe(false);
    expect(trillaSchema.safeParse({ peso_verde_final: "" }).success).toBe(false);
    expect(trillaSchema.safeParse({ peso_verde_final: 0 }).success).toBe(false);
  });

  it("acepta un peso en verde positivo", () => {
    const r = trillaSchema.safeParse({ peso_verde_final: 120.5 });
    expect(r.success).toBe(true);
  });
});

describe("catacionSchema", () => {
  it("exige el indicador de catado", () => {
    expect(catacionSchema.safeParse({ notas_catacion: "ok" }).success).toBe(false);
    expect(catacionSchema.safeParse({ catado: true }).success).toBe(true);
  });
});

describe("caracterizacionSchema", () => {
  it("acepta conteos y promedios opcionales", () => {
    const r = caracterizacionSchema.safeParse({
      cerezas_en_objetivo: 40,
      madura_bx_promedio: 21.3,
    });
    expect(r.success).toBe(true);
  });
});

describe("statusDeCodigoPg", () => {
  it("traduce los SQLSTATE del flujo de beneficio", () => {
    expect(statusDeCodigoPg("42501")).toBe(403);
    expect(statusDeCodigoPg("P0002")).toBe(404);
    expect(statusDeCodigoPg("22023")).toBe(422);
    expect(statusDeCodigoPg("55000")).toBe(409);
    expect(statusDeCodigoPg("23505")).toBe(409);
    expect(statusDeCodigoPg("23503")).toBe(400);
    expect(statusDeCodigoPg("23514")).toBe(422);
    expect(statusDeCodigoPg(undefined)).toBe(500);
  });
});
