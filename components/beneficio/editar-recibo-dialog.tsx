"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PorcentajeInput } from "@/components/ui/porcentaje-input";
import { actualizarRecibido, type RecibidoDetalle } from "@/lib/api/beneficio";
import type { ActualizarRecibidoInput } from "@/lib/schemas/beneficio";
import {
  CAMPOS_BENEFICIADO_HUMEDO,
  CAMPOS_DENSIDAD,
  CAMPOS_LIMPIEZA,
  CAMPOS_PRUEBAS_FISICAS,
  type CampoPruebaRecibido,
} from "@/lib/beneficio/pruebas-recibido";
import { detalleDeError } from "@/lib/api/http";

const CAMPO_KEYS = [
  ...CAMPOS_PRUEBAS_FISICAS,
  ...CAMPOS_BENEFICIADO_HUMEDO,
  ...CAMPOS_DENSIDAD,
  ...CAMPOS_LIMPIEZA,
].map((campo) => campo.key);

type Valores = Record<string, string>;

const aTexto = (valor: unknown) => (valor == null ? "" : String(valor));

export function EditarReciboDialog({
  lote,
  onOpenChange,
  onSaved,
}: {
  lote: RecibidoDetalle;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => {
    const inicial: Valores = {};
    for (const key of CAMPO_KEYS) inicial[key] = aTexto(lote[key as keyof RecibidoDetalle]);
    return inicial;
  });
  const [guardando, setGuardando] = useState(false);

  const cambiar = (key: string, valor: string) => setValores((prev) => ({ ...prev, [key]: valor }));

  const numero = (texto: string) => (texto.trim() === "" ? null : Number(texto));

  const guardar = async () => {
    setGuardando(true);
    const payload: Record<string, number | null> = {};
    for (const { key } of [...CAMPOS_PRUEBAS_FISICAS, ...CAMPOS_BENEFICIADO_HUMEDO, ...CAMPOS_DENSIDAD, ...CAMPOS_LIMPIEZA]) {
      payload[key] = numero(valores[key] ?? "");
    }
    try {
      await actualizarRecibido(lote.id_lote, payload as ActualizarRecibidoInput);
      toast.success("Recibo actualizado");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  const renderGrupo = (titulo: string, campos: CampoPruebaRecibido[], columnas: string) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <div className={`grid gap-4 ${columnas}`}>
        {campos.map(({ key, label, unidad }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`editar-${key}`}>{label}{unidad ? ` (${unidad})` : ""}</Label>
            {unidad ? (
              <Input
                id={`editar-${key}`}
                type="number"
                step="0.001"
                min={0}
                value={valores[key] ?? ""}
                onChange={(e) => cambiar(key, e.target.value)}
              />
            ) : (
              <PorcentajeInput id={`editar-${key}`} value={valores[key] ?? ""} onChange={(v) => cambiar(key, v)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderGrupo("Pruebas físicas de recibido (%)", CAMPOS_PRUEBAS_FISICAS, "sm:grid-cols-3 lg:grid-cols-5")}
      {renderGrupo("Beneficiado húmedo (%)", CAMPOS_BENEFICIADO_HUMEDO, "sm:grid-cols-2 lg:grid-cols-4")}
      {renderGrupo("Densidad", CAMPOS_DENSIDAD, "sm:grid-cols-2")}
      {renderGrupo("Limpieza (%)", CAMPOS_LIMPIEZA, "sm:grid-cols-2 lg:grid-cols-4")}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={guardando} onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={guardar} disabled={guardando}>
          {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
