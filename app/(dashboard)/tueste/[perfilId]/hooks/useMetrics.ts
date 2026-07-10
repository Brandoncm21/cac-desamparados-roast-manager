"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { MetricaLocal, MetricaTueste } from "../types";

interface UseMetricsProps {
  perfilId: number;
  initialMetricas: MetricaLocal[];
}

interface UseMetricsReturn {
  metricas: MetricaLocal[];
  setMetricas: React.Dispatch<React.SetStateAction<MetricaLocal[]>>;
  guardarMetrica: (tipo: string, antes: string, despues: string) => Promise<void>;
  calcularDiferencia: (antes: string, despues: string) => string;
}

export function useMetrics({ perfilId, initialMetricas }: UseMetricsProps): UseMetricsReturn {
  const [metricas, setMetricas] = useState<MetricaLocal[]>(initialMetricas);

  useEffect(() => {
    setMetricas(initialMetricas);
  }, [initialMetricas]);

  const guardarMetrica = useCallback(
    async (tipo: string, antes: string, despues: string) => {
      const body = {
        valor_antes: antes ? Number(antes) : null,
        valor_despues: despues ? Number(despues) : null,
      };

      const res = await fetch(
        `/api/perfiles-tueste/${perfilId}/metricas/${encodeURIComponent(tipo)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        toast.error(`Error al guardar métrica ${tipo}`);
      }
    },
    [perfilId]
  );

  const calcularDiferencia = useCallback((antes: string, despues: string): string => {
    const a = Number(antes);
    const d = Number(despues);
    if (!a || !d || a === 0) return "-";
    return (((a - d) / a) * 100).toFixed(2);
  }, []);

  return {
    metricas,
    setMetricas,
    guardarMetrica,
    calcularDiferencia,
  };
}

export type { MetricaTueste };
