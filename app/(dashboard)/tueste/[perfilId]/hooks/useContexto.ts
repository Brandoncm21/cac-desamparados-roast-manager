"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();
    const updateData: ContextoUpdate = {
      nombre_cafe: ctxNombreCafe || null,
      id_tostador: ctxIdTostador ? Number(ctxIdTostador) : null,
      temperatura_sala: ctxTempSala ? Number(ctxTempSala) : null,
      humedad_sala: ctxHumSala ? Number(ctxHumSala) : null,
    };

    const { error } = await supabase
      .from("perfiles_tueste")
      .update(updateData)
      .eq("id_perfil", perfilId);

    if (error) {
      toast.error("Error al guardar contexto");
      return;
    }

    setEditContext(false);
    toast.success("Contexto guardado");
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
