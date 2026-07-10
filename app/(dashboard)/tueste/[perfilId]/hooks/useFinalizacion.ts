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
  finalizarTueste: (isOnline: boolean) => Promise<void>;
}

export function useFinalizacion({ perfilId }: UseFinalizacionProps): UseFinalizacionReturn {
  const [showResumen, setShowResumen] = useState(false);
  const [resumen, setResumen] = useState<ResumenTueste | null>(null);

  const finalizarTueste = useCallback(
    async (isOnline: boolean) => {
      if (isOnline) {
        await syncAll();
        const supabase = createClient();

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

        await supabase
          .from("perfiles_tueste")
          .update({ estado: "Completado" })
          .eq("id_perfil", perfilId);
      } else {
        toast.error("Conéctese a internet para ver el resumen");
      }

      setShowResumen(true);
    },
    [perfilId]
  );

  return {
    showResumen,
    resumen,
    finalizarTueste,
  };
}
