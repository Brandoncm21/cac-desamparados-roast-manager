"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole, type UserRole } from "@/lib/auth-helpers";
import { detalleDeError } from "@/lib/api/http";
import { cambiarEstadoOrden, eliminarOrden } from "@/lib/api/ordenes";
import { crearPerfilTueste } from "@/lib/api/perfiles-tueste";
import { totalServicios, type MetricaTueste } from "@/lib/services/orden-detalle";
import type { OrdenDetalle, PerfilConResumen } from "../types";

export type { OrdenDetalle, PerfilConResumen } from "../types";

/**
 * Detalle de una orden y su tueste asociado.
 *
 * Antes la página encadenaba tres efectos: orden → perfil → resumen + métricas,
 * con dos consultas separadas a `perfiles_tueste` para la misma fila. Ahora el
 * perfil y su resumen llegan en una sola consulta.
 */
export function useOrdenDetalle(idOrden: number) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [perfil, setPerfil] = useState<PerfilConResumen | null | undefined>(undefined);
  const [metricas, setMetricas] = useState<MetricaTueste[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [creandoPerfil, setCreandoPerfil] = useState(false);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      const { data } = await supabase
        .from("ordenes_trabajo")
        .select(
          `
          *,
          clientes(*),
          fincas(nombre, altura),
          servicios_ejecutados(*),
          orden_pasos(servicios_maestro(tipo)),
          especificaciones_orden(*),
          empleado_recibe:empleados!id_empleado_recibe(nombre),
          empleado_entrega:empleados!id_empleado_entrega(nombre)
        `
        )
        .eq("id_orden", idOrden)
        .is("deleted_at", null)
        .single();

      if (vigente && data) setOrden(data as unknown as OrdenDetalle);
    };

    cargar();
    getCurrentUserRole().then((rol) => vigente && setUserRole(rol));

    return () => {
      vigente = false;
    };
  }, [idOrden, supabase]);

  const tieneTueste = Boolean(
    orden &&
      (orden.servicios_ejecutados.some((s) => s.tipo_servicio === "Tueste") ||
        orden.orden_pasos?.some((p) => p.servicios_maestro?.tipo === "tueste"))
  );

  useEffect(() => {
    if (!orden) return;

    if (!tieneTueste) {
      setPerfil(null);
      setMetricas([]);
      return;
    }

    let vigente = true;

    const cargarPerfil = async () => {
      // Perfil y resumen son la misma fila: una sola consulta.
      const { data } = await supabase
        .from("perfiles_tueste")
        .select(
          "id_perfil, estado, tiempo_desarrollo_min, dtr_porcentaje, fecha_optima_consumo, fecha_vencimiento"
        )
        .eq("id_orden", orden.id_orden)
        .is("deleted_at", null)
        .maybeSingle();

      if (!vigente) return;
      setPerfil(data as PerfilConResumen | null);
      if (!data) return;

      const { data: filas } = await supabase
        .from("metricas_tueste")
        .select("tipo_metrica, valor_antes, valor_despues, porcentaje_diferencia")
        .eq("id_perfil", (data as PerfilConResumen).id_perfil);

      if (vigente) setMetricas((filas ?? []) as MetricaTueste[]);
    };

    cargarPerfil();

    return () => {
      vigente = false;
    };
  }, [orden, tieneTueste, supabase]);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!orden) return;
    try {
      await cambiarEstadoOrden(orden.id_orden, nuevoEstado);
      toast.success(`Estado actualizado a ${nuevoEstado}`);
      setOrden({ ...orden, estado_orden: nuevoEstado });
      router.refresh();
    } catch (error) {
      toast.error("Error al cambiar estado: " + detalleDeError(error));
    }
  };

  const eliminar = async () => {
    if (!orden) return;
    if (!window.confirm("¿Está seguro de que desea eliminar esta orden?")) return;

    try {
      await eliminarOrden(orden.id_orden);
      toast.success("Orden eliminada exitosamente");
      router.push("/ordenes");
    } catch (error) {
      toast.error("Error al eliminar orden: " + detalleDeError(error));
    }
  };

  const iniciarTueste = async () => {
    if (!orden || creandoPerfil) return;

    setCreandoPerfil(true);
    try {
      const creado = await crearPerfilTueste({
        id_orden: orden.id_orden,
        nombre_cafe:
          orden.descripcion_producto || orden.clientes?.nombre_completo || "Nuevo lote",
      });

      if (creado?.id_perfil) {
        router.push(`/tueste/${creado.id_perfil}`);
      } else {
        toast.error("No se pudo obtener el ID del perfil creado");
      }
    } catch (error) {
      toast.error("Error al iniciar tueste: " + detalleDeError(error));
    } finally {
      setCreandoPerfil(false);
    }
  };

  return {
    orden,
    perfil,
    /** `undefined` = consulta en vuelo; `null` = la orden no tiene perfil. */
    cargandoPerfil: tieneTueste && perfil === undefined,
    metricas,
    userRole,
    creandoPerfil,
    tieneTueste,
    total: totalServicios(orden?.servicios_ejecutados ?? []),
    cambiarEstado,
    eliminar,
    iniciarTueste,
    imprimir: () => window.print(),
  };
}
