"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AjusteLocal } from "../types";

interface UseAdjustmentsProps {
  perfilId: number;
  initialAjustes: AjusteLocal[];
}

interface UseAdjustmentsReturn {
  ajustes: AjusteLocal[];
  setAjustes: React.Dispatch<React.SetStateAction<AjusteLocal[]>>;
  ajustesOpen: boolean;
  setAjustesOpen: (open: boolean) => void;
  agregarAjuste: () => void;
  eliminarAjuste: (index: number) => void;
  guardarAjuste: (ajuste: AjusteLocal, index: number) => Promise<void>;
}

export function useAdjustments({
  perfilId,
  initialAjustes,
}: UseAdjustmentsProps): UseAdjustmentsReturn {
  const [ajustes, setAjustes] = useState<AjusteLocal[]>(initialAjustes);
  const [ajustesOpen, setAjustesOpen] = useState(false);

  useEffect(() => {
    setAjustes(initialAjustes);
  }, [initialAjustes]);

  const agregarAjuste = useCallback(() => {
    setAjustes((prev) => [
      ...prev,
      {
        orden_secuencia: prev.length + 1,
        tiempo: "",
        temperatura_ajuste: "",
        llama: "",
        aire: "",
        _isNew: true,
      },
    ]);
  }, []);

  const eliminarAjuste = useCallback((index: number) => {
    setAjustes((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((a, i) => ({ ...a, orden_secuencia: i + 1 }))
    );
  }, []);

  const guardarAjuste = useCallback(
    async (ajuste: AjusteLocal, index: number) => {
      const body = {
        orden_secuencia: ajuste.orden_secuencia,
        tiempo: ajuste.tiempo ? Number(ajuste.tiempo) : null,
        temperatura_ajuste: ajuste.temperatura_ajuste ? Number(ajuste.temperatura_ajuste) : null,
        llama: ajuste.llama || null,
        aire: ajuste.aire || null,
      };

      const res = await fetch(`/api/perfiles-tueste/${perfilId}/ajustes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setAjustes((prev) =>
          prev.map((a, i) =>
            i === index ? { ...a, id: data.data.id_ajuste, _isNew: false } : a
          )
        );
        toast.success("Ajuste guardado");
      } else {
        toast.error("Error al guardar ajuste");
      }
    },
    [perfilId]
  );

  return {
    ajustes,
    setAjustes,
    ajustesOpen,
    setAjustesOpen,
    agregarAjuste,
    eliminarAjuste,
    guardarAjuste,
  };
}
