"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ContextoUpdate, PerfilTueste } from "../types";

interface UseContextoProps {
  perfilId: number;
  perfil: PerfilTueste | null;
}

interface UseContextoReturn {
  editContext: boolean;
  setEditContext: (edit: boolean) => void;
  ctxNombreCafe: string;
  setCtxNombreCafe: (value: string) => void;
  ctxIdTostador: string;
  setCtxIdTostador: (value: string) => void;
  ctxTempSala: string;
  setCtxTempSala: (value: string) => void;
  ctxHumSala: string;
  setCtxHumSala: (value: string) => void;
  guardarContexto: () => Promise<void>;
}

export function useContexto({ perfilId, perfil }: UseContextoProps): UseContextoReturn {
  const [editContext, setEditContext] = useState(false);
  const [ctxNombreCafe, setCtxNombreCafe] = useState(perfil?.nombre_cafe || "");
  const [ctxIdTostador, setCtxIdTostador] = useState(
    perfil?.id_tostador ? String(perfil.id_tostador) : ""
  );
  const [ctxTempSala, setCtxTempSala] = useState(
    perfil?.temperatura_sala != null ? String(perfil.temperatura_sala) : ""
  );
  const [ctxHumSala, setCtxHumSala] = useState(
    perfil?.humedad_sala != null ? String(perfil.humedad_sala) : ""
  );

  useEffect(() => {
    setCtxNombreCafe(perfil?.nombre_cafe || "");
    setCtxIdTostador(perfil?.id_tostador ? String(perfil.id_tostador) : "");
    setCtxTempSala(perfil?.temperatura_sala != null ? String(perfil.temperatura_sala) : "");
    setCtxHumSala(perfil?.humedad_sala != null ? String(perfil.humedad_sala) : "");
  }, [perfil]);

  const guardarContexto = async () => {
    const updateData: ContextoUpdate = {
      nombre_cafe: ctxNombreCafe || null,
      id_tostador: ctxIdTostador ? Number(ctxIdTostador) : null,
      temperatura_sala: ctxTempSala ? Number(ctxTempSala) : null,
      humedad_sala: ctxHumSala ? Number(ctxHumSala) : null,
    };

    try {
      const res = await fetch(`/api/perfiles-tueste/${perfilId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(
          "Error al guardar contexto: " +
            (result.error?.message || "Error desconocido")
        );
        return;
      }

      setEditContext(false);
      toast.success("Contexto guardado");
    } catch {
      toast.error("Error al guardar contexto");
    }
  };

  return {
    editContext,
    setEditContext,
    ctxNombreCafe,
    setCtxNombreCafe,
    ctxIdTostador,
    setCtxIdTostador,
    ctxTempSala,
    setCtxTempSala,
    ctxHumSala,
    setCtxHumSala,
    guardarContexto,
  };
}
