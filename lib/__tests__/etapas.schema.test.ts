import { describe, it, expect } from "vitest";
import {
  guardarCaracterizacionBodySchema,
  guardarSecadoBodySchema,
  guardarBodegaBodySchema,
  guardarTrillaBodySchema,
} from "../schemas/etapas";

describe("guardarCaracterizacionBodySchema", () => {
  it("acepta payload completo con RCs", () => {
    const res = guardarCaracterizacionBodySchema.safeParse({
      caracterizacion: { tiempo: "2026-11-06T10:00", broca: 1.5, pc_verdes: 88.5 },
      rcs: [{ tipo_rc: "maduras", gbx: 21.5, promedio: 1.2 }],
    });
    expect(res.success).toBe(true);
  });

  it("exige tiempo (muestreo)", () => {
    expect(guardarCaracterizacionBodySchema.safeParse({ caracterizacion: {} }).success).toBe(false);
  });

  it("rechaza RC fuera del CHECK de tipos", () => {
    const res = guardarCaracterizacionBodySchema.safeParse({
      caracterizacion: { tiempo: "2026-11-06T10:00" },
      rcs: [{ tipo_rc: "verdes" }],
    });
    expect(res.success).toBe(false);
  });
});

describe("guardarSecadoBodySchema", () => {
  it("exige finicio y rechaza ffinal <= finicio", () => {
    expect(
      guardarSecadoBodySchema.safeParse({
        secado: { finicio: "2026-11-06T08:00", ffinal: "2026-11-06T07:00" },
      }).success
    ).toBe(false);
  });

  it("acepta humedad 0-100 y rechaza fuera de rango", () => {
    expect(
      guardarSecadoBodySchema.safeParse({
        secado: { finicio: "2026-11-06T08:00" },
        humedades: [{ fecha: "2026-11-06T09:00", humedad: 18.5 }],
      }).success
    ).toBe(true);
    expect(
      guardarSecadoBodySchema.safeParse({
        secado: { finicio: "2026-11-06T08:00" },
        humedades: [{ fecha: "2026-11-06T09:00", humedad: 140 }],
      }).success
    ).toBe(false);
  });
});

describe("guardarBodegaBodySchema", () => {
  it("exige id_secado y cantidad_sacos >=1 en vínculos (disp. 13)", () => {
    const ok = guardarBodegaBodySchema.safeParse({
      bodega: { w_pergamino: 700, d_pergamino: 0.68 },
      secados_guardados: [{ id_secado: 2, cantidad_sacos: 10 }],
    });
    expect(ok.success).toBe(true);

    const fail = guardarBodegaBodySchema.safeParse({
      bodega: {},
      secados_guardados: [{ id_secado: 2, cantidad_sacos: 0 }],
    });
    expect(fail.success).toBe(false);
  });

  it("densidades/porcentajes numéricosomalizados ('' → null)", () => {
    const res = guardarBodegaBodySchema.parse({
      bodega: { hinicial: "", d_bellota: NaN },
      secados_guardados: [],
    });
    expect(res.bodega.hinicial).toBeNull();
    expect(res.bodega.d_bellota).toBeNull();
  });
});

describe("guardarTrillaBodySchema", () => {
  it("porcentajes fuera de rango se rechazan (CHECKs de BD no se alcanzan)", () => {
    const res = guardarTrillaBodySchema.safeParse({
      trilla: { pprimera: 150.0, hinicial: 22.5, hfinal: 11.0 },
    });
    expect(res.success).toBe(false);
  });

  it("peso_verde '' = toggle off; objeto = upsert", () => {
    expect(
      guardarTrillaBodySchema.safeParse({
        trilla: { hinicial: 20, hfinal: 11 },
        peso_verde: "",
      }).success
    ).toBe(true);
    expect(
      guardarTrillaBodySchema.safeParse({
        trilla: { hinicial: 20, hfinal: 11 },
        peso_verde: { wfinal: 640, winferiores: 10 },
      }).success
    ).toBe(true);
  });
});
