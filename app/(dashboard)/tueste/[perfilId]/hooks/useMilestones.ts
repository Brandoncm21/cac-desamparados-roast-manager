"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveHitoLocal, addToSyncQueue, type HitoRecord } from "@/lib/offline/db";
import { syncAll } from "@/lib/offline/sync";
import { HITOS_RAPIDOS, type HitoEditData, type PuntoTemperatura } from "../types";

interface UseMilestonesProps {
  perfilId: number;
  isOnline: boolean;
  currentMinute: number;
  temperaturaInput: string;
  puntos: PuntoTemperatura[];
  initialHitos: HitoRecord[];
}

interface UseMilestonesReturn {
  hitos: HitoRecord[];
  editHitosOpen: boolean;
  setEditHitosOpen: (open: boolean) => void;
  editHitosData: Record<string, HitoEditData>;
  setEditHitosData: React.Dispatch<React.SetStateAction<Record<string, HitoEditData>>>;
  registrarHito: (tipoHito: string) => Promise<void>;
  guardarTodosHitos: () => Promise<void>;
}

export function useMilestones({
  perfilId,
  isOnline,
  currentMinute,
  temperaturaInput,
  puntos,
  initialHitos,
}: UseMilestonesProps): UseMilestonesReturn {
  const [hitos, setHitos] = useState<HitoRecord[]>(initialHitos);
  const [editHitosOpen, setEditHitosOpen] = useState(false);
  const [editHitosData, setEditHitosData] = useState<Record<string, HitoEditData>>({});

  useEffect(() => {
    setHitos(initialHitos);
  }, [initialHitos]);

  useEffect(() => {
    if (editHitosOpen) {
      const data: Record<string, HitoEditData> = {};
      HITOS_RAPIDOS.forEach((h) => {
        const found = hitos.find((hi) => hi.tipo_hito === h);
        data[h] = {
          tiempo_min: found?.tiempo_min != null ? String(found.tiempo_min) : "",
          temperatura: found?.temperatura != null ? String(found.temperatura) : "",
        };
      });
      setEditHitosData(data);
    }
  }, [editHitosOpen, hitos]);

  const registrarHito = useCallback(
    async (tipoHito: string) => {
      const temp =
        Number(temperaturaInput) ||
        (puntos.length > 0 ? puntos[puntos.length - 1]?.temperatura ?? 0 : 0);

      const record: HitoRecord = {
        id_perfil: perfilId,
        tipo_hito: tipoHito,
        tiempo_min: currentMinute,
        temperatura: temp,
        synced: false,
      };

      await saveHitoLocal(record);
      await addToSyncQueue({ table: "hitos_termicos", data: record, id_perfil: perfilId });

      setHitos((prev) => [...prev.filter((h) => h.tipo_hito !== tipoHito), record]);
      toast.success(`${tipoHito} registrado`);

      if (isOnline) syncAll();
    },
    [temperaturaInput, puntos, currentMinute, perfilId, isOnline]
  );

  const guardarTodosHitos = useCallback(async () => {
    const hitosPayload = Object.entries(editHitosData).map(([tipoHito, data]) => ({
      tipo_hito: tipoHito,
      tiempo_min: data.tiempo_min ? Number(data.tiempo_min) : null,
      temperatura: data.temperatura ? Number(data.temperatura) : null,
    }));

    try {
      const res = await fetch(`/api/perfiles-tueste/${perfilId}/hitos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hitos: hitosPayload }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(
          "Error al guardar hitos: " +
            (result.error?.message || "Error desconocido")
        );
        return;
      }

      setHitos(
        (result.data as HitoRecord[] | null)?.map((h) => ({ ...h, synced: true })) ?? []
      );
      setEditHitosOpen(false);
      toast.success("Hitos actualizados");
    } catch {
      toast.error("Error al guardar hitos");
    }
  }, [editHitosData, perfilId]);

  return {
    hitos,
    editHitosOpen,
    setEditHitosOpen,
    editHitosData,
    setEditHitosData,
    registrarHito,
    guardarTodosHitos,
  };
}
