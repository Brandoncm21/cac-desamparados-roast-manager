"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputConUnidad } from "@/components/ui/input-unidad";
import { Label } from "@/components/ui/label";
import { PorcentajeInput } from "@/components/ui/porcentaje-input";
import {
  guardarEtapa,
  type CuerpoEtapa,
  type EtapaFila,
  type RecibidoLote,
  type ResultadoEtapa,
} from "@/lib/api/beneficio";
import { calcularTiempoSecado } from "@/lib/services/beneficio";
import { ApiError, detalleDeError } from "@/lib/api/http";

const MEDICIONES = [1, 2, 3, 4, 5] as const;

interface Valores {
  fecha_inicio_secado: string;
  fecha_finalizacion_secado: string;
  numero_cama: string;
  porcentaje_solar: string;
  porcentaje_mecanico: string;
  humedad_1: string;
  humedad_2: string;
  humedad_3: string;
  humedad_4: string;
  humedad_5: string;
  tem_1: string;
  tem_2: string;
  tem_3: string;
  tem_4: string;
  tem_5: string;
  peso_inicial: string;
  peso_final: string;
}

function texto(valor: unknown): string {
  return valor == null ? "" : String(valor);
}

function construirValores(fila: EtapaFila | null): Valores {
  return {
    fecha_inicio_secado: texto(fila?.["fecha_inicio_secado"]).slice(0, 10),
    fecha_finalizacion_secado: texto(fila?.["fecha_finalizacion_secado"]).slice(0, 10),
    numero_cama: texto(fila?.["numero_cama"]),
    porcentaje_solar: texto(fila?.["porcentaje_solar"]),
    porcentaje_mecanico: texto(fila?.["porcentaje_mecanico"]),
    humedad_1: texto(fila?.["humedad_1"]),
    humedad_2: texto(fila?.["humedad_2"]),
    humedad_3: texto(fila?.["humedad_3"]),
    humedad_4: texto(fila?.["humedad_4"]),
    humedad_5: texto(fila?.["humedad_5"]),
    tem_1: texto(fila?.["tem_1"]),
    tem_2: texto(fila?.["tem_2"]),
    tem_3: texto(fila?.["tem_3"]),
    tem_4: texto(fila?.["tem_4"]),
    tem_5: texto(fila?.["tem_5"]),
    peso_inicial: texto(fila?.["peso_inicial"]),
    peso_final: texto(fila?.["peso_final"]),
  };
}

function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function FormularioSecado({
  lote,
  initial,
  onSaved,
  onCancel,
}: {
  lote: RecibidoLote;
  initial: EtapaFila | null;
  onSaved: (resultado: ResultadoEtapa) => void;
  onCancel?: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => construirValores(initial));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cambiar = (key: keyof Valores, valor: string) => {
    setValores((prev) => ({ ...prev, [key]: valor }));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _omitido, ...resto } = prev;
      return resto;
    });
  };

  const tiempo = useMemo(
    () =>
      calcularTiempoSecado(
        valores.fecha_inicio_secado,
        valores.fecha_finalizacion_secado
      ),
    [valores.fecha_inicio_secado, valores.fecha_finalizacion_secado]
  );

  const fechasInvertidas =
    valores.fecha_inicio_secado !== "" &&
    valores.fecha_finalizacion_secado !== "" &&
    valores.fecha_finalizacion_secado < valores.fecha_inicio_secado;

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrores({});

    const payload: Record<string, unknown> = {
      fecha_inicio_secado: valores.fecha_inicio_secado || null,
      fecha_finalizacion_secado: valores.fecha_finalizacion_secado || null,
      numero_cama: valores.numero_cama.trim() || null,
      porcentaje_solar: aNumero(valores.porcentaje_solar),
      porcentaje_mecanico: aNumero(valores.porcentaje_mecanico),
      peso_inicial: aNumero(valores.peso_inicial),
      peso_final: aNumero(valores.peso_final),
    };

    for (const n of MEDICIONES) {
      payload[`humedad_${n}`] = aNumero(valores[`humedad_${n}` as keyof Valores]);
      payload[`tem_${n}`] = aNumero(valores[`tem_${n}` as keyof Valores]);
    }

    setGuardando(true);
    try {
      const resultado = await guardarEtapa(lote.id_lote, "secado", payload as CuerpoEtapa);
      toast.success(`Secado guardado — el lote quedó en «${resultado.enproceso}»`);
      onSaved(resultado);
    } catch (error) {
      if (error instanceof ApiError) {
        const planos: Record<string, string> = {};
        for (const [campo, mensajes] of Object.entries(error.fieldErrors)) {
          const primero = mensajes[0];
          if (primero) planos[campo] = primero;
        }
        setErrores(planos);
      }
      toast.error(detalleDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-6">
      {Object.keys(errores).length > 0 && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {Object.values(errores)[0]}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de secado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="secado-lote">Lote asignado</Label>
            <Input
              id="secado-lote"
              value={`${lote.numero_lote} — ${lote.numero_recibo}`}
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secado-fecha-inicio">Fecha de inicio de secado</Label>
            <Input
              id="secado-fecha-inicio"
              type="date"
              value={valores.fecha_inicio_secado}
              onChange={(e) => cambiar("fecha_inicio_secado", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secado-fecha-fin">Fecha de finalización de secado</Label>
            <Input
              id="secado-fecha-fin"
              type="date"
              value={valores.fecha_finalizacion_secado}
              onChange={(e) => cambiar("fecha_finalizacion_secado", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secado-tiempo">Tiempo de secado (calculado)</Label>
            <Input id="secado-tiempo" value={tiempo.texto ?? "—"} readOnly />
            {fechasInvertidas && (
              <p className="text-xs text-destructive">
                La fecha final es anterior al inicio; no se calculará el tiempo.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secado-cama">Número de cama</Label>
            <Input
              id="secado-cama"
              value={valores.numero_cama}
              onChange={(e) => cambiar("numero_cama", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipo de secado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="secado-solar">Porcentaje solar</Label>
            <PorcentajeInput
              id="secado-solar"
              value={valores.porcentaje_solar}
              onChange={(v) => cambiar("porcentaje_solar", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secado-mecanico">Porcentaje mecánico</Label>
            <PorcentajeInput
              id="secado-mecanico"
              value={valores.porcentaje_mecanico}
              onChange={(v) => cambiar("porcentaje_mecanico", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mediciones de humedad y temperatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[7rem_1fr_1fr]">
            <span>Medición</span>
            <span>Humedad (%)</span>
            <span>Temperatura (°C)</span>
          </div>
          {MEDICIONES.map((n) => (
            <div
              key={n}
              className="grid gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-[7rem_1fr_1fr] sm:items-center sm:border-0 sm:p-1"
            >
              <Label className="text-xs sm:text-sm">Medición {n}</Label>
              <InputConUnidad
                id={`secado-humedad-${n}`}
                unidad="%"
                min={0}
                max={100}
                step="0.01"
                value={valores[`humedad_${n}` as keyof Valores]}
                onChange={(v) => cambiar(`humedad_${n}` as keyof Valores, v)}
                aria-label={`Humedad medición ${n}`}
              />
              <InputConUnidad
                id={`secado-tem-${n}`}
                unidad="°C"
                step="0.1"
                value={valores[`tem_${n}` as keyof Valores]}
                onChange={(v) => cambiar(`tem_${n}` as keyof Valores, v)}
                aria-label={`Temperatura medición ${n}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="secado-peso-inicial">Peso inicial</Label>
            <InputConUnidad
              id="secado-peso-inicial"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_inicial}
              onChange={(v) => cambiar("peso_inicial", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secado-peso-final">Peso final</Label>
            <InputConUnidad
              id="secado-peso-final"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_final}
              onChange={(v) => cambiar("peso_final", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar secado
        </Button>
      </div>
    </form>
  );
}
