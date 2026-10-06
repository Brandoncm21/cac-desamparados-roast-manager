"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { MetricaLocal, ResumenTueste } from "../types";
import { RendimientosTable } from "./RendimientosTable";
import { Summary } from "./Summary";

const METRICAS_OBLIGATORIAS = ["Peso"];

interface RendimientosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricas: MetricaLocal[];
  setMetricas: React.Dispatch<React.SetStateAction<MetricaLocal[]>>;
  calcularDiferencia: (antes: string, despues: string) => string;
  onConfirmar: () => Promise<void>;
  onIrAOrden: () => void;
  resumen: ResumenTueste | null;
  submitting: boolean;
}

export function RendimientosDialog({
  open,
  onOpenChange,
  metricas,
  setMetricas,
  calcularDiferencia,
  onConfirmar,
  onIrAOrden,
  resumen,
  submitting,
}: RendimientosDialogProps) {
  const [advertencia, setAdvertencia] = useState<string[] | null>(null);
  const [paso, setPaso] = useState<"captura" | "resumen">("captura");

  useEffect(() => {
    if (open) {
      setAdvertencia(null);
      setPaso("captura");
    }
  }, [open]);

  const intentarFinalizar = async () => {
    const faltantes = metricas
      .filter((m) => METRICAS_OBLIGATORIAS.includes(m.tipo_metrica))
      .flatMap((m) => {
        const faltan: string[] = [];
        if (!m.valor_antes) faltan.push(`${m.tipo_metrica} — Antes`);
        if (!m.valor_despues) faltan.push(`${m.tipo_metrica} — Después`);
        return faltan;
      });

    if (faltantes.length > 0) {
      setAdvertencia(faltantes);
      return;
    }

    setAdvertencia(null);
    await onConfirmar();
    setPaso("resumen");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {paso === "captura" && !advertencia && (
          <>
            <DialogHeader>
              <DialogTitle>Rendimientos y Mermas</DialogTitle>
              <DialogDescription>
                Registre los valores antes y después del tueste para calcular los rendimientos.
                El Peso es obligatorio porque se usa para calcular el precio del servicio.
              </DialogDescription>
            </DialogHeader>

            <RendimientosTable
              metricas={metricas}
              setMetricas={setMetricas}
              calcularDiferencia={calcularDiferencia}
              metricasRequeridas={METRICAS_OBLIGATORIAS}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={intentarFinalizar} disabled={submitting}>
                {submitting ? "Finalizando..." : "Finalizar Tueste"}
              </Button>
            </DialogFooter>
          </>
        )}

        {paso === "captura" && advertencia && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Campos obligatorios en blanco
              </DialogTitle>
              <DialogDescription>
                Antes de finalizar el tueste debe completar: {advertencia.join(", ")}.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button type="button" onClick={() => setAdvertencia(null)}>
                Completar datos
              </Button>
            </DialogFooter>
          </>
        )}

        {paso === "resumen" && (
          <>
            <DialogHeader>
              <DialogTitle>Resumen del Tueste</DialogTitle>
              <DialogDescription>
                Tueste finalizado y métricas guardadas. Revise el resumen y vuelva a la orden.
              </DialogDescription>
            </DialogHeader>

            {resumen ? (
              <Summary resumen={resumen} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No se pudo cargar el resumen del tueste.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button type="button" onClick={onIrAOrden}>
                Ir a Ver Orden
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
