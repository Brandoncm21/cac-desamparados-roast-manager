"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  saveTemperaturaLocal,
  addToSyncQueue,
  type TemperaturaRecord,
} from "@/lib/offline/db";
import { syncAll } from "@/lib/offline/sync";
import type { PuntoTemperatura } from "../types";

interface UseTemperaturesProps {
  perfilId: number;
  isOnline: boolean;
  timeStep: number;
  initialPuntos: PuntoTemperatura[];
  initialCurrentMinute: number;
}

interface UseTemperaturesReturn {
  temperatura: string;
  setTemperatura: (value: string) => void;
  minutoManual: string;
  setMinutoManual: (value: string) => void;
  puntos: PuntoTemperatura[];
  currentMinute: number;
  registrarTemperatura: () => Promise<void>;
  loadServerTemperatures: () => Promise<void>;
}

export function useTemperatures({
  perfilId,
  isOnline,
  timeStep,
  initialPuntos,
  initialCurrentMinute,
}: UseTemperaturesProps): UseTemperaturesReturn {
  const [temperatura, setTemperatura] = useState("");
  const [minutoManual, setMinutoManual] = useState("");
  const [puntos, setPuntos] = useState<PuntoTemperatura[]>(initialPuntos);
  const [currentMinute, setCurrentMinute] = useState(initialCurrentMinute);

  useEffect(() => {
    setPuntos(initialPuntos);
    setCurrentMinute(initialCurrentMinute);
  }, [initialPuntos, initialCurrentMinute]);

  const loadServerTemperatures = useCallback(async () => {
    const supabase = createClient();
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
  }, [perfilId, timeStep]);

  const registrarTemperatura = useCallback(async () => {
    const temp = Number(temperatura);
    if (temp < 70 || temp > 220) {
      toast.error("Temperatura debe estar entre 70°C y 220°C");
      return;
    }

    const minuto = minutoManual !== "" ? Number(minutoManual) : currentMinute;
    if (minuto < 0) {
      toast.error("Minuto inválido");
      return;
    }

    const record: TemperaturaRecord = {
      id_perfil: perfilId,
      minuto,
      temperatura_registrada: temp,
      synced: false,
    };

    await saveTemperaturaLocal(record);
    await addToSyncQueue({ table: "trazabilidad_temperatura", data: record, id_perfil: perfilId });

    setPuntos((prev) => {
      const filtered = prev.filter((p) => p.minuto !== minuto);
      return [...filtered, { minuto, temperatura: temp }].sort((a, b) => a.minuto - b.minuto);
    });

    if (minutoManual === "") {
      setCurrentMinute((prev) => prev + timeStep);
    }

    setTemperatura("");
    setMinutoManual("");

    if (isOnline) syncAll();
  }, [temperatura, minutoManual, currentMinute, perfilId, isOnline, timeStep]);

  return {
    temperatura,
    setTemperatura,
    minutoManual,
    setMinutoManual,
    puntos,
    currentMinute,
    registrarTemperatura,
    loadServerTemperatures,
  };
}
