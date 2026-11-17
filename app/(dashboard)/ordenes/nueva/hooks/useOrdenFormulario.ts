"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearOrdenSchema } from "@/lib/schemas/ordenes";

/**
 * Formulario del alta de órdenes.
 *
 * Es una fábrica para que la página y los hooks compartan exactamente el mismo
 * tipo (`OrdenForm`) y los mismos valores por defecto, sin duplicarlos.
 */
export function useOrdenFormulario() {
  return useForm({
    resolver: zodResolver(crearOrdenSchema),
    defaultValues: {
      id_cliente: 0,
      id_finca: null,
      lotes: [],
      descripcion_producto: "",
      proceso_cafe: "",
      porcentaje_humedad_entrada: null,
      firma_aprobacion_cliente: false,
      servicios: [],
      tipo_tueste: "",
      tipo_molienda: "",
      tipo_empaque: "",
      observaciones: "",
      id_empleado_recibe: undefined,
    },
  });
}

export type OrdenForm = ReturnType<typeof useOrdenFormulario>;
