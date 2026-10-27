"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { syncAll } from "@/lib/offline/sync";
import type { MetricaTueste, ResumenTueste } from "../types";

interface UseFinalizacionProps {
  perfilId: number;
}

interface UseFinalizacionReturn {
  showResumen: boolean;
  resumen: ResumenTueste | null;
  finalizarTueste: (isOnline: boolean) => Promise<boolean>;
}

export function useFinalizacion({ perfilId }: UseFinalizacionProps): UseFinalizacionReturn {
  const [showResumen, setShowResumen] = useState(false);
  const [resumen, setResumen] = useState<ResumenTueste | null>(null);

  const finalizarTueste = useCallback(
    async (isOnline: boolean): Promise<boolean> => {
      if (isOnline) {
        await syncAll();
        const supabase = createClient();

        // Marcar el perfil como Completado vía API (no update directo).
        try {
          const res = await fetch(`/api/perfiles-tueste/${perfilId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "Completado" }),
          });
          if (!res.ok) {
            const result = await res.json();
            toast.error(
              "Error al finalizar el tueste: " +
                (result.error?.message || "Error desconocido")
            );
            setShowResumen(true);
            return false;
          }
        } catch {
          toast.error("Error al finalizar el tueste");
          setShowResumen(true);
          return false;
        }

        const { data } = await supabase
          .from("perfiles_tueste")
          .select(
            "tiempo_desarrollo_min, dtr_porcentaje, fecha_optima_consumo, fecha_vencimiento, estado"
          )
          .eq("id_perfil", perfilId)
          .single();

        const { data: metricasData } = await supabase
          .from("metricas_tueste")
          .select("*")
          .eq("id_perfil", perfilId);

        setResumen({
          ...(data || {}),
          metricas: (metricasData || []) as MetricaTueste[],
        });
      } else {
        toast.error("Conéctese a internet para ver el resumen");
      }

      setShowResumen(true);
      return true;
    },
    [perfilId]
  );

  return {
    showResumen,
    resumen,
    finalizarTueste,
  };
}
