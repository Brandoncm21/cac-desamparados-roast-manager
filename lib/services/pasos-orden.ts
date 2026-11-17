/**
 * Reglas puras del flujo de pasos de una orden.
 *
 * El panel visual solo pinta y delega aquí: qué paso toca, cuánto se acumula y
 * qué cuerpo exacto debe enviarse a cada endpoint.
 */

export type EstadoPasoFlujo = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "OMITIDO";

/** Forma mínima de un paso para estas reglas. */
export interface PasoFlujo {
  id_paso: number;
  prioridad: number;
  estado: EstadoPasoFlujo;
  costo_total_paso: number | string | null;
}

/**
 * Primer paso accionable: ordena por prioridad y desempata por id, igual que el
 * orden que garantiza la base de datos.
 */
export function seleccionarPasoActual<T extends PasoFlujo>(pasos: readonly T[]): T | null {
  const ordenados = [...pasos].sort(
    (a, b) => a.prioridad - b.prioridad || a.id_paso - b.id_paso
  );

  return ordenados.find((p) => p.estado !== "COMPLETADO" && p.estado !== "OMITIDO") ?? null;
}

/** Suma de los costos de los pasos ya completados. */
export function calcularTotalAcumulado(pasos: readonly PasoFlujo[]): number {
  return pasos
    .filter((p) => p.estado === "COMPLETADO")
    .reduce((suma, p) => suma + (Number(p.costo_total_paso) || 0), 0);
}

export type AccionPaso = "iniciar" | "cerrar" | "confirmar-tueste";

export interface EntradaEnvioPaso {
  accion: AccionPaso;
  esEmpacado: boolean;
  /** Valor crudo del input de peso. */
  peso: string;
  /** Valor crudo del select de empaque. */
  empaqueId: string;
  observaciones: string;
}

export type ResultadoEnvioPaso =
  | { ok: true; sufijo: string; body: Record<string, unknown> }
  | { ok: false; error: string };

function numeroPositivo(valor: string): number | null {
  if (valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero;
}

function observacionesONull(observaciones: string): string | null {
  return observaciones.trim() === "" ? null : observaciones;
}

/**
 * Traduce el estado del diálogo al cuerpo que espera cada endpoint, validando
 * antes de tocar la red.
 */
export function prepararEnvioPaso(entrada: EntradaEnvioPaso): ResultadoEnvioPaso {
  const { accion, esEmpacado, peso, empaqueId, observaciones } = entrada;
  const observacionesFinales = observacionesONull(observaciones);

  if (accion === "iniciar") {
    const pesoInicial = numeroPositivo(peso);
    if (pesoInicial === null) {
      return { ok: false, error: "Ingrese un peso inicial válido" };
    }
    return { ok: true, sufijo: "iniciar", body: { peso_inicial_kg: pesoInicial } };
  }

  if (accion === "cerrar" && esEmpacado) {
    if (!empaqueId) {
      return { ok: false, error: "Seleccione un empaque" };
    }
    return {
      ok: true,
      sufijo: "cerrar",
      body: { empaque_id: Number(empaqueId), observaciones: observacionesFinales },
    };
  }

  if (accion === "cerrar") {
    let pesoFinal: number | null = null;
    if (peso !== "") {
      pesoFinal = numeroPositivo(peso);
      if (pesoFinal === null) {
        return { ok: false, error: "El peso final debe ser un número válido" };
      }
    }
    return {
      ok: true,
      sufijo: "cerrar",
      body: { peso_final_kg: pesoFinal, observaciones: observacionesFinales },
    };
  }

  const pesoFinal = numeroPositivo(peso);
  if (pesoFinal === null) {
    return { ok: false, error: "Ingrese un peso final válido" };
  }
  return {
    ok: true,
    sufijo: "confirmar-tueste",
    body: { peso_final_kg: pesoFinal, observaciones: observacionesFinales },
  };
}

const MENSAJES_EXITO: Record<AccionPaso, string> = {
  iniciar: "Paso iniciado",
  cerrar: "Paso completado",
  "confirmar-tueste": "Tueste confirmado",
};

export function mensajeExitoPaso(accion: AccionPaso): string {
  return MENSAJES_EXITO[accion];
}
