"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTemperaturasLocal, getHitosLocal } from "@/lib/offline/db";
import type {
  Empleado,
  PerfilTueste,
  MetricaLocal,
  AjusteLocal,
  PuntoTemperatura,
  HitoRecord,
} from "../types";

interface TuesteData {
  empleados: Empleado[];
  perfil: PerfilTueste | null;
  metricas: MetricaLocal[];
  ajustes: AjusteLocal[];
  puntos: PuntoTemperatura[];
  hitos: HitoRecord[];
  currentMinute: number;
  isLoading: boolean;
}

const DEFAULT_METRICAS: MetricaLocal[] = [
  { tipo_metrica: "Peso", valor_antes: "", valor_despues: "" },
  { tipo_metrica: "Humedad", valor_antes: "", valor_despues: "" },
  { tipo_metrica: "Densidad", valor_antes: "", valor_despues: "" },
];

export function useTuesteData(perfilId: number, timeStep: number): TuesteData {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [perfil, setPerfil] = useState<PerfilTueste | null>(null);
  const [metricas, setMetricas] = useState<MetricaLocal[]>(DEFAULT_METRICAS);
  const [ajustes, setAjustes] = useState<AjusteLocal[]>([]);
  const [puntos, setPuntos] = useState<PuntoTemperatura[]>([]);
  const [hitos, setHitos] = useState<HitoRecord[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(perfilId) || perfilId <= 0) return;

    const loadData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      try {
        const { data: empData } = await supabase
          .from("empleados")
          .select("id_empleado, nombre, rol")
          .eq("activo", true)
          .order("nombre");
        if (empData) setEmpleados(empData);

        const { data: perfilData } = await supabase
          .from("perfiles_tueste")
          .select(
            "*, empleados!perfiles_tueste_id_tostador_fkey(nombre), ordenes_trabajo(numero_factura)"
          )
          .eq("id_perfil", perfilId)
          .is("deleted_at", null)
          .single();
        if (perfilData) setPerfil(perfilData);

        const { data: metricasData } = await supabase
          .from("metricas_tueste")
          .select("*")
          .eq("id_perfil", perfilId);
        if (metricasData) {
          setMetricas((prev) =>
            prev.map((m) => {
              const found = metricasData.find((d) => d.tipo_metrica === m.tipo_metrica);
              return found
                ? {
                    ...m,
                    valor_antes: found.valor_antes != null ? String(found.valor_antes) : "",
                    valor_despues: found.valor_despues != null ? String(found.valor_despues) : "",
                  }
                : m;
            })
          );
        }

        const { data: ajustesData } = await supabase
          .from("ajustes_tueste")
          .select("*")
          .eq("id_perfil", perfilId)
          .order("orden_secuencia");
        if (ajustesData && ajustesData.length > 0) {
          setAjustes(
            ajustesData.map((a) => ({
              id: a.id_ajuste,
              orden_secuencia: a.orden_secuencia,
              tiempo: a.tiempo != null ? String(a.tiempo) : "",
              temperatura_ajuste: a.temperatura_ajuste != null ? String(a.temperatura_ajuste) : "",
              llama: a.llama || "",
              aire: a.aire || "",
            }))
          );
        }

        const localTemp = await getTemperaturasLocal(perfilId);
        const localHitos = await getHitosLocal(perfilId);

        if (localTemp.length > 0) {
          const pts = localTemp.map((t) => ({
            minuto: t.minuto,
            temperatura: t.temperatura_registrada,
          }));
          setPuntos(pts);
          setCurrentMinute(Math.max(...pts.map((p) => p.minuto)) + timeStep);
        } else {
          const { data: serverTemp } = await supabase
            .from("trazabilidad_temperatura")
            .select("*")
            .eq("id_perfil", perfilId)
            .order("minuto");
          if (serverTemp?.length) {
            const pts = serverTemp.map((t) => ({
              minuto: Number(t.minuto),
              temperatura: t.temperatura_registrada,
            }));
            setPuntos(pts);
            setCurrentMinute(Math.max(...pts.map((p) => p.minuto)) + timeStep);
          }
        }

        if (localHitos.length > 0) {
          setHitos(localHitos);
        } else {
          const { data: serverHitos } = await supabase
            .from("hitos_termicos")
            .select("*")
            .eq("id_perfil", perfilId);
          if (serverHitos) setHitos(serverHitos.map((h) => ({ ...h, synced: true })));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [perfilId, timeStep]);

  return {
    empleados,
    perfil,
    metricas,
    ajustes,
    puntos,
    hitos,
    currentMinute,
    isLoading,
  };
}
