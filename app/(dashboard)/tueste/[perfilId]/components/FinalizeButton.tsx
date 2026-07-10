"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface FinalizeButtonProps {
  showResumen: boolean;
  onFinalizar: () => Promise<void>;
}

export function FinalizeButton({ showResumen, onFinalizar }: FinalizeButtonProps) {
  const router = useRouter();

  if (!showResumen) {
    return (
      <Button
        onClick={onFinalizar}
        className="w-full h-14 md:h-16 text-base md:text-lg font-bold"
        size="lg"
      >
        Finalizar Tueste y Ver Resumen
      </Button>
    );
  }

  return (
    <Button
      onClick={() => router.push("/tueste")}
      variant="outline"
      className="w-full h-14 md:h-12"
    >
      Volver a lista de perfiles
    </Button>
  );
}
