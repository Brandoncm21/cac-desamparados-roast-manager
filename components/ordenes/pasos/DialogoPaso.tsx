"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcularEmpaques, getCurrentPrecioEmpaque } from "@/lib/services/empacado";
import type { AccionPaso } from "@/lib/services/pasos-orden";
import type { EmpaqueOpcion, EntradaEnvio } from "./usePasosOrden";

interface DialogoPasoProps {
  accion: AccionPaso;
  nombrePaso: string;
  esEmpacado: boolean;
  empaques: EmpaqueOpcion[];
  pesoBaseEmpacado: number | null | undefined;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: (entrada: EntradaEnvio) => void;
}

function titulo(accion: AccionPaso, nombrePaso: string): string {
  if (accion === "iniciar") return `Iniciar: ${nombrePaso}`;
  if (accion === "confirmar-tueste") return "Confirmar Tueste";
  return `Completar: ${nombrePaso}`;
}

function descripcion(accion: AccionPaso, esEmpacado: boolean): string {
  if (accion === "iniciar") {
    return "Registre el peso operativo del paso. Es la base para el cálculo del cobro.";
  }
  if (accion === "confirmar-tueste") {
    return "Registre el peso final del tueste para calcular la merma.";
  }
  if (esEmpacado) {
    return "Seleccione el empaque. Las unidades se calculan con el peso base del paso.";
  }
  return "El cobro ya quedó calculado con el peso inicial. El peso final es opcional.";
}

/**
 * Diálogo de captura de un paso.
 *
 * El componente se monta solo cuando hay una acción en curso, así que sus
 * campos arrancan vacíos sin necesidad de un efecto de reinicio.
 */
export function DialogoPaso({
  accion,
  nombrePaso,
  esEmpacado,
  empaques,
  pesoBaseEmpacado,
  enviando,
  onCancelar,
  onConfirmar,
}: DialogoPasoProps) {
  const [peso, setPeso] = useState("");
  const [empaqueId, setEmpaqueId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const previewEmpacado = useMemo(() => {
    if (accion !== "cerrar" || !esEmpacado || !empaqueId || !pesoBaseEmpacado) return null;
    const empaque = empaques.find((e) => e.id_empaque === Number(empaqueId));
    if (!empaque) return null;

    const precio = getCurrentPrecioEmpaque(empaque.empaque_precios);
    if (precio == null || empaque.capacidad_kg == null || empaque.capacidad_kg <= 0) return null;

    try {
      return calcularEmpaques({
        pesoDisponible: pesoBaseEmpacado,
        capacidadKg: empaque.capacidad_kg,
        precioUnitario: precio,
      });
    } catch {
      return null;
    }
  }, [accion, esEmpacado, empaqueId, empaques, pesoBaseEmpacado]);

  const confirmar = () => onConfirmar({ peso, empaqueId, observaciones });

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancelar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo(accion, nombrePaso)}</DialogTitle>
          <DialogDescription>{descripcion(accion, esEmpacado)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {accion === "iniciar" && (
            <div className="space-y-2">
              <Label>{esEmpacado ? "Peso base (kg) *" : "Peso inicial (kg) *"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          )}

          {accion === "cerrar" && !esEmpacado && (
            <div className="space-y-2">
              <Label>Peso final (kg) — opcional</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Dejar vacío si no aplica"
              />
            </div>
          )}

          {accion === "cerrar" && esEmpacado && (
            <div className="space-y-2">
              <Label>Empaque *</Label>
              <Select value={empaqueId} onValueChange={(valor) => valor && setEmpaqueId(valor)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empaque..." />
                </SelectTrigger>
                <SelectContent>
                  {empaques.map((empaque) => (
                    <SelectItem key={empaque.id_empaque} value={String(empaque.id_empaque)}>
                      {empaque.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Peso base: {pesoBaseEmpacado != null ? `${pesoBaseEmpacado} kg` : "—"}
              </p>
              {previewEmpacado && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm">
                  <p className="font-medium text-emerald-800">
                    {previewEmpacado.cantidad} unidades · ₡
                    {previewEmpacado.costoEmpaques.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {accion === "confirmar-tueste" && (
            <div className="space-y-2">
              <Label>Peso final (kg) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          )}

          {(accion === "cerrar" || accion === "confirmar-tueste") && (
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Opcional..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={enviando}>
            {enviando ? "Procesando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
