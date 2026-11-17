"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole, canEditOrder, type UserRole } from "@/lib/auth-helpers";
import { detalleDeError } from "@/lib/api/http";
import { ejecutarAccionPaso, listarPasosOrden, type PasoOrden } from "@/lib/api/ordenes";
import { crearPerfilTueste } from "@/lib/api/perfiles-tueste";
import {
  calcularTotalAcumulado,
  mensajeExitoPaso,
  prepararEnvioPaso,
  seleccionarPasoActual,
  type AccionPaso,
} from "@/lib/services/pasos-orden";

export interface EmpaqueOpcion {
  id_empaque: number;
  nombre: string;
  capacidad_kg: number | null;
  empaque_precios: { precio: number; valid_to: string | null; valid_from: string | null }[];
}

interface PerfilTueste {
  id_perfil: number;
}

export interface EntradaEnvio {
  peso: string;
  empaqueId: string;
  observaciones: string;
}

/**
 * Estado y acciones del flujo de pasos de una orden.
 *
 * El componente solo pinta; aquí viven la carga, el paso activo, los catálogos
 * que dependen del tipo de servicio y el envío de transiciones.
 */
export function usePasosOrden(idOrden: number) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [pasos, setPasos] = useState<PasoOrden[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [empaques, setEmpaques] = useState<EmpaqueOpcion[]>([]);
  const [perfilTueste, setPerfilTueste] = useState<PerfilTueste | null | undefined>(undefined);
  const [creandoPerfil, setCreandoPerfil] = useState(false);

  const [accion, setAccion] = useState<AccionPaso | null>(null);
  const [pasoActivo, setPasoActivo] = useState<PasoOrden | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarPasos = useCallback(async () => {
    setLoading(true);
    try {
      setPasos(await listarPasosOrden(idOrden));
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setLoading(false);
    }
  }, [idOrden]);

  useEffect(() => {
    cargarPasos();
    getCurrentUserRole().then(setUserRole);
  }, [cargarPasos]);

  const pasoActual = useMemo(() => seleccionarPasoActual(pasos), [pasos]);
  const esTuesteActivo = pasoActual?.servicios_maestro.tipo === "tueste";
  const esEmpacadoActivo = pasoActual?.servicios_maestro.tipo === "empacado";

  // El catálogo de empaques solo se necesita cuando el paso activo es de empacado.
  useEffect(() => {
    if (!esEmpacadoActivo) {
      setEmpaques([]);
      return;
    }
    supabase
      .from("empaques")
      .select("id_empaque, nombre, capacidad_kg, empaque_precios(precio, valid_from, valid_to)")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        setEmpaques((data ?? []) as EmpaqueOpcion[]);
      });
  }, [esEmpacadoActivo, supabase]);

  // Perfil de tueste asociado a la orden, si el paso activo es de tueste.
  useEffect(() => {
    if (!esTuesteActivo) {
      setPerfilTueste(undefined);
      return;
    }
    setPerfilTueste(undefined);
    supabase
      .from("perfiles_tueste")
      .select("id_perfil")
      .eq("id_orden", idOrden)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data }) => setPerfilTueste(data as PerfilTueste | null));
  }, [esTuesteActivo, idOrden, supabase]);

  const abrirDialogo = (nuevaAccion: AccionPaso, paso: PasoOrden) => {
    setAccion(nuevaAccion);
    setPasoActivo(paso);
  };

  const cerrarDialogo = () => {
    setAccion(null);
    setPasoActivo(null);
  };

  const irAPerfilTueste = async () => {
    if (!esTuesteActivo || !pasoActual || creandoPerfil) return;

    if (perfilTueste) {
      router.push(`/tueste/${perfilTueste.id_perfil}`);
      return;
    }

    setCreandoPerfil(true);
    try {
      const perfil = await crearPerfilTueste({
        id_orden: idOrden,
        nombre_cafe: `Tueste orden #${idOrden}`,
      });
      toast.success("Perfil de tueste creado");
      setPerfilTueste(perfil);
      router.push(`/tueste/${perfil.id_perfil}`);
    } catch (error) {
      toast.error("Error al crear perfil de tueste: " + detalleDeError(error));
    } finally {
      setCreandoPerfil(false);
    }
  };

  const confirmarEnvio = async (entrada: EntradaEnvio) => {
    if (!accion || !pasoActivo) return;

    const preparado = prepararEnvioPaso({
      accion,
      esEmpacado: esEmpacadoActivo,
      ...entrada,
    });

    if (!preparado.ok) {
      toast.error(preparado.error);
      return;
    }

    setEnviando(true);
    try {
      await ejecutarAccionPaso(idOrden, pasoActivo.id_paso, preparado.sufijo, preparado.body);
      toast.success(mensajeExitoPaso(accion));
      cerrarDialogo();
      await cargarPasos();
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setEnviando(false);
    }
  };

  const pesoBaseEmpacado = pasoActual?.peso_facturable_kg ?? pasoActual?.peso_inicial_kg;

  return {
    pasos,
    loading,
    pasoActual,
    totalAcumulado: calcularTotalAcumulado(pasos),
    puedeEjecutar: canEditOrder(userRole),
    empaques,
    perfilTueste,
    creandoPerfil,
    esEmpacadoActivo,
    pesoBaseEmpacado,
    accion,
    pasoActivo,
    enviando,
    abrirDialogo,
    cerrarDialogo,
    irAPerfilTueste,
    confirmarEnvio,
  };
}
