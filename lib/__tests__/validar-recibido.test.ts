import { describe, it, expect } from "vitest";
import { camposFaltantes } from "../beneficio/validar-recibido";

const base = {
  productor_id: "1",
  finca_id: "2",
  varietal: "Catuaí",
  cajuelas: "10",
  cuartillos: "5",
  proceso: "",
  proceso_otro: "",
};

const fincaCompleta = { id_finca: 2, zona: "Tarrazú", altura: 1500 };

describe("camposFaltantes", () => {
  it("no reporta faltantes con todos los obligatorios", () => {
    expect(camposFaltantes(base, fincaCompleta)).toEqual([]);
  });

  it("reporta productor, finca, varietal y cantidades faltantes", () => {
    const faltan = camposFaltantes(
      { ...base, productor_id: "", finca_id: "", varietal: "", cajuelas: "", cuartillos: "" },
      null
    );
    const etiquetas = faltan.map((f) => f.etiqueta);
    expect(etiquetas).toContain("Productor");
    expect(etiquetas).toContain("Finca");
    expect(etiquetas).toContain("Varietal");
    expect(etiquetas).toContain("Cajuelas");
    expect(etiquetas).toContain("Cuartillos");
  });

  it("reporta zona y altura si la finca elegida no está disponible", () => {
    const faltan = camposFaltantes(base, null);
    const etiquetas = faltan.map((f) => f.etiqueta);
    expect(etiquetas).toContain("Zona de la finca");
    expect(etiquetas).toContain("Altura de la finca");
  });

  it("reporta finca sin zona o sin altura", () => {
    expect(camposFaltantes(base, { ...fincaCompleta, zona: null }).map((f) => f.campo)).toEqual(["zona_finca"]);
    expect(camposFaltantes(base, { ...fincaCompleta, altura: null }).map((f) => f.campo)).toEqual(["altura_finca"]);
  });

  it("rechaza cantidades no enteras o negativas", () => {
    expect(camposFaltantes({ ...base, cajuelas: "1.5" }, fincaCompleta).map((f) => f.campo)).toEqual(["cajuelas"]);
    expect(camposFaltantes({ ...base, cuartillos: "-1" }, fincaCompleta).map((f) => f.campo)).toEqual(["cuartillos"]);
  });

  it("exige especificar el proceso cuando se elige Otro", () => {
    expect(camposFaltantes({ ...base, proceso: "Otro" }, fincaCompleta).map((f) => f.campo)).toEqual(["proceso_otro"]);
    expect(camposFaltantes({ ...base, proceso: "Otro", proceso_otro: "Honey fermentado" }, fincaCompleta)).toEqual([]);
  });
});
