"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ApiError, detalleDeError } from "@/lib/api/http";
import { crearOrden } from "@/lib/api/ordenes";
import { listarRecibidos, type RecibidoLote } from "@/lib/api/beneficio";
import { listarServiciosActivos, type ServicioActivo } from "@/lib/api/servicios";
import {
  MOLIENDA_DEFAULT,
  requiereHumedad,
  tieneMolido,
  tieneTipoEmpacado,
  tieneTipoTueste,
} from "@/lib/services/visibilidad";
import { validarOrdenParaConfirmar } from "@/lib/services/orden-validacion";
import type { CrearOrdenInput } from "@/lib/schemas/ordenes";
import type { ClienteOption, EmpleadoOption } from "../types";
import type { OrdenForm } from "./useOrdenFormulario";

type CampoFormulario = Parameters<OrdenForm["setError"]>[0];

/**
 * Datos y acciones del alta de órdenes.
 *
 * Concentra la carga del catálogo, la lista de servicios añadidos, las banderas
 * derivadas del contrato y el envío. La página queda como composición visual.
 */
export function useNuevaOrden(form: OrdenForm) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [serviciosActivos, setServiciosActivos] = useState<ServicioActivo[]>([]);
  const [lotesOrden, setLotesOrden] = useState<RecibidoLote[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CrearOrdenInput | null>(null);

  // Una sola tanda de peticiones: el catálogo, los lotes y los dos catálogos de
  // Supabase son independientes entre sí.
  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      const [resClientes, resEmpleados, catalogo, lotes] = await Promise.all([
        supabase.from("clientes").select("id_cliente, nombre_completo").order("nombre_completo"),
        supabase.from("empleados").select("id_empleado, nombre").eq("activo", true).order("nombre"),
        listarServiciosActivos().catch(() => null),
        listarRecibidos({ pageSize: 100 })
          .then((r) => r.items)
          .catch(() => [] as RecibidoLote[]),
      ]);

      if (!vigente) return;

      if (resClientes.data) setClientes(resClientes.data);
      if (resEmpleados.data) setEmpleados(resEmpleados.data);
      if (catalogo) setServiciosActivos(catalogo.servicios);
      setLotesOrden(lotes);
    };

    cargar();
    return () => {
      vigente = false;
    };
  }, [supabase]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "servicios" });

  const serviciosSeleccionados = form.watch("servicios") as CrearOrdenInput["servicios"];

  const idsSeleccionados = useMemo(
    () => new Set(serviciosSeleccionados.map((s) => s.servicio_id)),
    [serviciosSeleccionados]
  );

  const serviciosInfo = useMemo(
    () =>
      serviciosSeleccionados
        .map((s) => serviciosActivos.find((sa) => sa.id_servicio_maestro === s.servicio_id))
        .filter((s): s is ServicioActivo => Boolean(s)),
    [serviciosSeleccionados, serviciosActivos]
  );

  const hayTueste = tieneTipoTueste(serviciosInfo);
  const hayEmpaque = tieneTipoEmpacado(serviciosInfo);
  const hayMolido = tieneMolido(serviciosInfo);
  const hayHumedad = requiereHumedad(serviciosInfo);

  // La molienda solo es editable si se contrató el servicio; si no, vuelve al
  // valor por defecto del tueste.
  useEffect(() => {
    if (hayMolido) return;
    const actual = form.getValues("tipo_molienda") ?? "";
    const objetivo = hayTueste ? MOLIENDA_DEFAULT : "";
    if (actual !== objetivo) {
      form.setValue("tipo_molienda", objetivo);
    }
  }, [hayTueste, hayMolido, form]);

  const alternarLote = (idLote: number, activo: boolean) => {
    const actuales = (form.getValues("lotes") ?? []) as number[];
    const siguientes = activo
      ? Array.from(new Set([...actuales, idLote]))
      : actuales.filter((id) => id !== idLote);
    form.setValue("lotes", siguientes, { shouldValidate: true });
  };

  const agregarServicio = (idServicio: number) => {
    const servicio = serviciosActivos.find((s) => s.id_servicio_maestro === idServicio);
    if (!servicio || idsSeleccionados.has(idServicio)) return;
    append({ servicio_id: servicio.id_servicio_maestro, tipo_servicio: servicio.nombre });
  };

  const quitarServicio = (indice: number) => remove(indice);

  /** Valida los obligatorios y abre el resumen de confirmación. */
  const solicitarConfirmacion = (values: CrearOrdenInput) => {
    const faltante = validarOrdenParaConfirmar(values);
    if (faltante) {
      form.setError(faltante.campo as CampoFormulario, { message: faltante.mensaje });
      toast.error(faltante.mensaje);
      return;
    }

    setPendingValues(values);
    setConfirmOpen(true);
  };

  const confirmar = async () => {
    if (!pendingValues) return;

    setSubmitting(true);
    try {
      await crearOrden(pendingValues);
      toast.success("Orden creada exitosamente");
      setConfirmOpen(false);
      router.push("/ordenes");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [campo, mensajes] of Object.entries(error.fieldErrors)) {
          if (!mensajes.length) continue;
          form.setError(campo as CampoFormulario, { message: mensajes.join(", ") });
        }
      }
      toast.error("Error al crear orden: " + detalleDeError(error));
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const lotesSeleccionados = (form.watch("lotes") ?? []) as number[];

  return {
    clientes,
    empleados,
    serviciosActivos,
    lotesOrden,
    submitting,
    confirmOpen,
    setConfirmOpen,
    pendingValues,
    fields,
    idsSeleccionados,
    lotesSeleccionados,
    flags: { hayTueste, hayEmpaque, hayMolido, hayHumedad },
    alternarLote,
    agregarServicio,
    quitarServicio,
    solicitarConfirmacion,
    confirmar,
  };
}
