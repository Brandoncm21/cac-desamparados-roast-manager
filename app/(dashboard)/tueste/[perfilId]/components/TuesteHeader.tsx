"use client";

import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, Download } from "lucide-react";
import type { PerfilTueste } from "../types";

interface TuesteHeaderProps {
  perfilId: number;
  perfil: PerfilTueste | null;
  currentMinute: number;
  isOnline: boolean;
  onDescargarPDF: () => Promise<void>;
}

export function TuesteHeader({
  perfilId,
  perfil,
  currentMinute,
  isOnline,
  onDescargarPDF,
}: TuesteHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-12 lg:pt-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold break-words">
          {perfil?.nombre_cafe || `Perfil #${perfilId}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Lote: {perfil?.numero_lote || "-"} | Minuto: {currentMinute}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDescargarPDF}>
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium px-3 py-1.5 bg-green-50 rounded-full">
            <Cloud className="h-4 w-4" /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium px-3 py-1.5 bg-red-50 rounded-full">
            <CloudOff className="h-4 w-4" /> Offline
          </span>
        )}
      </div>
    </div>
  );
}
