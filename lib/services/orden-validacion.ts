/**
 * Reglas puras del alta de órdenes.
 *
 * Vive fuera del componente para poder testearla y para que la página no
 * repita validaciones que ya declara `crearOrdenSchema`.
 */

export type CampoOrden = "id_cliente" | "servicios" | "id_empleado_recibe";

export interface FaltanteRequerido {
  campo: CampoOrden;
  mensaje: string;
}

export interface DatosOrdenParaValidar {
  id_cliente?: number | null;
  servicios: readonly unknown[];
  id_empleado_recibe?: number | null;
}

/**
 * Devuelve el primer campo obligatorio que falta, o `null` si la orden puede
 * confirmarse. El orden de comprobación define qué error se muestra primero.
 */
export function validarOrdenParaConfirmar(
  datos: DatosOrdenParaValidar
): FaltanteRequerido | null {
  if (!datos.id_cliente || datos.id_cliente <= 0) {
    return { campo: "id_cliente", mensaje: "Debe seleccionar un cliente" };
  }

  if (datos.servicios.length === 0) {
    return { campo: "servicios", mensaje: "Agregue al menos un servicio" };
  }

  if (!datos.id_empleado_recibe) {
    return { campo: "id_empleado_recibe", mensaje: "Debe seleccionar un responsable" };
  }

  return null;
}

export interface FlagsServicios {
  hayTueste: boolean;
  hayMolido: boolean;
  hayEmpaque: boolean;
}

export interface DatosOpcionalesOrden {
  proceso_cafe?: string | null;
  descripcion_producto?: string | null;
  tipo_tueste?: string | null;
  tipo_molienda?: string | null;
  tipo_empaque?: string | null;
  observaciones?: string | null;
}

function vacio(valor: string | null | undefined): boolean {
  return !valor || valor.trim() === "";
}

/**
 * Campos opcionales sin completar, con el nombre que ve el usuario.
 *
 * El resumen de confirmación los muestra como advertencia: no bloquean el alta.
 */
export function camposOpcionalesVacios(
  datos: DatosOpcionalesOrden,
  flags: FlagsServicios
): string[] {
  const vacios: string[] = [];

  if (vacio(datos.proceso_cafe)) vacios.push("Proceso de café");
  if (vacio(datos.descripcion_producto)) vacios.push("Descripción del producto");
  if (flags.hayTueste && vacio(datos.tipo_tueste)) vacios.push("Tipo de tueste");
  if (flags.hayTueste && flags.hayMolido && vacio(datos.tipo_molienda)) {
    vacios.push("Tipo de molienda");
  }
  if (flags.hayEmpaque && vacio(datos.tipo_empaque)) vacios.push("Tipo de empaque");
  if (vacio(datos.observaciones)) vacios.push("Observaciones");

  return vacios;
}
