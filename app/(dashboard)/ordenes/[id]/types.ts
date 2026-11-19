export interface ClienteOrden {
  nombre_completo: string;
  telefono: string | null;
}

export interface ServicioOrden {
  id_servicio: number;
  tipo_servicio: string;
  servicio_id: number | null;
  empaque_id: number | null;
  empaques?: { nombre: string } | null;
  peso_inicial: number | null;
  peso_kg: number | null;
  precio: number | null;
  snapshot_precio_por_kg: number | null;
  snapshot_precio_empaque: number | null;
  linea_total: number | null;
  override_precio: boolean;
  override_motivo: string | null;
}

export interface LoteOrden {
  numero_lote: string;
  enproceso: string;
}

export interface EspecificacionesOrden {
  tipo_tueste: string | null;
  tipo_molienda: string | null;
  tipo_empaque: string | null;
  observaciones: string | null;
}

/** Orden tal como la devuelve el `select` anidado del detalle. */
export interface OrdenDetalle {
  id_orden: number;
  numero_factura: string;
  fecha_orden: string;
  hora_cierre: string | null;
  estado_orden: string;
  proceso_cafe: string | null;
  porcentaje_humedad_entrada: number | null;
  descripcion_producto: string | null;
  clientes: ClienteOrden | null;
  fincas?: { nombre: string; altura: number | null } | null;
  lotes?: LoteOrden[];
  servicios_ejecutados: ServicioOrden[];
  orden_pasos: { servicios_maestro: { tipo: string } }[];
  especificaciones_orden: EspecificacionesOrden | null;
  empleado_recibe: { nombre: string } | null;
  empleado_entrega: { nombre: string } | null;
}

/** Perfil de tueste con los campos que muestra el resumen. */
export interface PerfilConResumen {
  id_perfil: number;
  estado: string | null;
  tiempo_desarrollo_min: number | null;
  dtr_porcentaje: number | null;
  fecha_optima_consumo: string | null;
  fecha_vencimiento: string | null;
}
