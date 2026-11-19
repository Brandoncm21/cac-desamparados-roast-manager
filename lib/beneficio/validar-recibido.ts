export interface ValoresRecibidoValidacion {
  productor_id: string;
  finca_id: string;
  varietal: string;
  cajuelas: string;
  cuartillos: string;
  proceso: string;
  proceso_otro: string;
}

export interface FincaRecibidoValidacion {
  id_finca: number;
  zona: string | null;
  altura: number | null;
}

export interface CampoFaltante {
  campo: string;
  etiqueta: string;
  mensaje: string;
}

const vacio = (valor: string) => valor.trim() === "";

const enteroValido = (valor: string) => {
  if (vacio(valor)) return false;
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0;
};

export function camposFaltantes(
  valores: ValoresRecibidoValidacion,
  finca: FincaRecibidoValidacion | null
): CampoFaltante[] {
  const faltantes: CampoFaltante[] = [];

  if (vacio(valores.productor_id)) {
    faltantes.push({ campo: "productor_id", etiqueta: "Productor", mensaje: "Seleccione un productor" });
  }
  if (vacio(valores.finca_id)) {
    faltantes.push({ campo: "finca_id", etiqueta: "Finca", mensaje: "Seleccione una finca" });
  } else {
    if (!finca || finca.zona == null || finca.zona.trim() === "") {
      faltantes.push({ campo: "zona_finca", etiqueta: "Zona de la finca", mensaje: "La finca seleccionada no tiene zona registrada" });
    }
    if (!finca || finca.altura == null) {
      faltantes.push({ campo: "altura_finca", etiqueta: "Altura de la finca", mensaje: "La finca seleccionada no tiene altura registrada" });
    }
  }
  if (vacio(valores.varietal)) {
    faltantes.push({ campo: "varietal", etiqueta: "Varietal", mensaje: "El varietal es obligatorio" });
  }
  if (!enteroValido(valores.cajuelas)) {
    faltantes.push({ campo: "cajuelas", etiqueta: "Cajuelas", mensaje: "Ingrese un número entero mayor o igual a 0" });
  }
  if (!enteroValido(valores.cuartillos)) {
    faltantes.push({ campo: "cuartillos", etiqueta: "Cuartillos", mensaje: "Ingrese un número entero mayor o igual a 0" });
  }
  if (valores.proceso === "Otro" && vacio(valores.proceso_otro)) {
    faltantes.push({ campo: "proceso_otro", etiqueta: "Especifique el proceso", mensaje: "Describa el proceso" });
  }

  return faltantes;
}
