"use client";

import { Button } from "@/components/ui/button";

interface FinalizeButtonProps {
  showResumen: boolean;
  onAbrirRendimientos: () => void;
  onIrAOrden: () => void;
}

export function FinalizeButton({ showResumen, onAbrirRendimientos, onIrAOrden }: FinalizeButtonProps) {
  if (!showResumen) {
    return (
      <Button
        onClick={onAbrirRendimientos}
        className="w-full h-14 md:h-16 text-base md:text-lg font-bold"
        size="lg"
      >
        Finalizar Tueste y Ver Resumen
      </Button>
    );
  }

  return (
    <Button
      onClick={onIrAOrden}
      variant="outline"
      className="w-full h-14 md:h-12"
    >
      Ir a Ver Orden
    </Button>
  );
}
