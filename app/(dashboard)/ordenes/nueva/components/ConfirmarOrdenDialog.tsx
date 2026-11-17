"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { camposOpcionalesVacios, type FlagsServicios } from "@/lib/services/orden-validacion";
import type { CrearOrdenInput } from "@/lib/schemas/ordenes";
import type { ClienteOption, EmpleadoOption } from "../types";

interface ConfirmarOrdenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: CrearOrdenInput | null;
  clientes: ClienteOption[];
  empleados: EmpleadoOption[];
  flags: FlagsServicios;
  submitting: boolean;
  onConfirm: () => void;
}

/**
 * Resumen previo al alta: recuerda los datos esenciales y advierte de los
 * opcionales sin completar (no bloquean la creación).
 */
export function ConfirmarOrdenDialog({
  open,
  onOpenChange,
  pending,
  clientes,
  empleados,
  flags,
  submitting,
  onConfirm,
}: ConfirmarOrdenDialogProps) {
  const faltantes = useMemo(
    () => (pending ? camposOpcionalesVacios(pending, flags) : []),
    [pending, flags]
  );

  const nombreCliente = clientes.find((c) => c.id_cliente === pending?.id_cliente)?.nombre_completo;
  const nombreResponsable = empleados.find(
    (e) => e.id_empleado === pending?.id_empleado_recibe
  )?.nombre;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar creación de orden</DialogTitle>
          <DialogDescription>Revise los datos esenciales antes de continuar.</DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-amber-700">Datos esenciales</p>
              <p>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                {nombreCliente || "No seleccionado"}
              </p>
              <p>
                <span className="text-muted-foreground">Responsable:</span>{" "}
                {nombreResponsable || "No seleccionado"}
              </p>
              <p>
                <span className="text-muted-foreground">Servicios:</span>{" "}
                {pending.servicios.map((s) => s.tipo_servicio).join(", ")}
              </p>
            </div>

            {faltantes.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                <p className="font-medium text-amber-800 mb-1">Campos opcionales sin completar</p>
                <p className="text-amber-700">{faltantes.join(", ")}</p>
                <p className="text-xs text-amber-600 mt-1">
                  Estos datos pueden completarse más tarde desde la edición de la orden.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Revisar formulario
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Creando..." : "Confirmar creación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
