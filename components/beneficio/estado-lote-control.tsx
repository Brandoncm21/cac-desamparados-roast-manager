"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { actualizarEstadoRecibido } from "@/lib/api/beneficio";
import { detalleDeError } from "@/lib/api/http";

const OPCIONES: Array<{ value: "proceso" | "disponible" | "vendido"; label: string }> = [
  { value: "proceso", label: "En proceso" },
  { value: "disponible", label: "Disponible" },
  { value: "vendido", label: "Vendido" },
];

export function EstadoLoteControl({
  idLote,
  estado,
  disabled,
  onChanged,
}: {
  idLote: number;
  estado: "proceso" | "disponible" | "vendido";
  disabled?: boolean;
  onChanged?: () => void;
}) {
  const [guardando, setGuardando] = useState<string | null>(null);

  const cambiar = async (nuevo: "proceso" | "disponible" | "vendido") => {
    if (nuevo === estado) return;
    setGuardando(nuevo);
    try {
      await actualizarEstadoRecibido(idLote, nuevo);
      toast.success("Estado actualizado");
      onChanged?.();
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setGuardando(null);
    }
  };

  return (
    <Card className="w-full sm:w-[360px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Estado del lote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Actual:</span>
          <EstadoBadge estado={estado} familia="estado_lote" />
        </div>
        <div className="grid gap-2">
          {OPCIONES.map((op) => (
            <Button
              key={op.value}
              type="button"
              variant={estado === op.value ? "default" : "outline"}
              className="justify-start"
              disabled={disabled || guardando !== null}
              onClick={() => cambiar(op.value)}
            >
              {guardando === op.value && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {op.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
