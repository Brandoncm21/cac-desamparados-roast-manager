export interface ClienteOption {
  id_cliente: number;
  nombre_completo: string;
}

export interface EmpleadoOption {
  id_empleado: number;
  nombre: string;
}

/** Elemento de la lista de servicios ya añadidos al formulario. */
export interface CampoListaServicio {
  id: string;
  tipo_servicio: string;
}
