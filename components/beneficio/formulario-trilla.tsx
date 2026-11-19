"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputConUnidad } from "@/components/ui/input-unidad";
import { Label } from "@/components/ui/label";
import { PorcentajeInput } from "@/components/ui/porcentaje-input";
import { Textarea } from "@/components/ui/textarea";
import {
  guardarEtapa,
  type CuerpoEtapa,
  type EtapaFila,
  type RecibidoLote,
  type ResultadoEtapa,
} from "@/lib/api/beneficio";
import { ApiError, detalleDeError } from "@/lib/api/http";

const CALIDADES = [
  { key: "porcentaje_primera", label: "Primera" },
  { key: "porcentaje_madres", label: "Madres" },
  { key: "porcentaje_caracolillo", label: "Caracolillo" },
  { key: "porcentaje_menudos", label: "Menudos" },
  { key: "porcentaje_cataduras", label: "Cataduras" },
  { key: "porcentaje_segundas", label: "Segundas" },
  { key: "porcentaje_barreduras", label: "Barreduras" },
  { key: "porcentaje_escogeduras", label: "Escogeduras" },
  { key: "porcentaje_otras_inferiores", label: "Otras inferiores" },
] as const;

interface Valores {
  fecha_final_reposo: string;
  pruebas_fisicas_trilla: string;
  rendimiento_teorico_pelado: string;
  rendimiento_teorico_seleccion: string;
  rendimiento_final_pelado: string;
  rendimiento_final_seleccion: string;
  peso_en_verde_teorico: string;
  peso_verde_final: string;
  humedad_inicial_pergamino_bellota: string;
  humedad_final_verde: string;
  porcentaje_primera: string;
  porcentaje_madres: string;
  porcentaje_caracolillo: string;
  porcentaje_menudos: string;
  porcentaje_cataduras: string;
  porcentaje_segundas: string;
  porcentaje_barreduras: string;
  porcentaje_escogeduras: string;
  porcentaje_otras_inferiores: string;
  peso_en_verde_final: string;
  peso_verde_inferiores: string;
  peso_en_verde_final_inferior: string;
}

function texto(valor: unknown): string {
  return valor == null ? "" : String(valor);
}

function construirValores(fila: EtapaFila | null): Valores {
  return {
    fecha_final_reposo: texto(fila?.["fecha_final_reposo"]).slice(0, 10),
    pruebas_fisicas_trilla: texto(fila?.["pruebas_fisicas_trilla"]),
    rendimiento_teorico_pelado: texto(fila?.["rendimiento_teorico_pelado"]),
    rendimiento_teorico_seleccion: texto(fila?.["rendimiento_teorico_seleccion"]),
    rendimiento_final_pelado: texto(fila?.["rendimiento_final_pelado"]),
    rendimiento_final_seleccion: texto(fila?.["rendimiento_final_seleccion"]),
    peso_en_verde_teorico: texto(fila?.["peso_en_verde_teorico"]),
    peso_verde_final: texto(fila?.["peso_verde_final"]),
    humedad_inicial_pergamino_bellota: texto(fila?.["humedad_inicial_pergamino_bellota"]),
    humedad_final_verde: texto(fila?.["humedad_final_verde"]),
    porcentaje_primera: texto(fila?.["porcentaje_primera"]),
    porcentaje_madres: texto(fila?.["porcentaje_madres"]),
    porcentaje_caracolillo: texto(fila?.["porcentaje_caracolillo"]),
    porcentaje_menudos: texto(fila?.["porcentaje_menudos"]),
    porcentaje_cataduras: texto(fila?.["porcentaje_cataduras"]),
    porcentaje_segundas: texto(fila?.["porcentaje_segundas"]),
    porcentaje_barreduras: texto(fila?.["porcentaje_barreduras"]),
    porcentaje_escogeduras: texto(fila?.["porcentaje_escogeduras"]),
    porcentaje_otras_inferiores: texto(fila?.["porcentaje_otras_inferiores"]),
    peso_en_verde_final: texto(fila?.["peso_en_verde_final"]),
    peso_verde_inferiores: texto(fila?.["peso_verde_inferiores"]),
    peso_en_verde_final_inferior: texto(fila?.["peso_en_verde_final_inferior"]),
  };
}

function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function FormularioTrilla({
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

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrores({});

    const payload: Record<string, unknown> = {
      fecha_final_reposo: valores.fecha_final_reposo || null,
      pruebas_fisicas_trilla: valores.pruebas_fisicas_trilla.trim() || null,
      rendimiento_teorico_pelado: aNumero(valores.rendimiento_teorico_pelado),
      rendimiento_teorico_seleccion: aNumero(valores.rendimiento_teorico_seleccion),
      rendimiento_final_pelado: aNumero(valores.rendimiento_final_pelado),
      rendimiento_final_seleccion: aNumero(valores.rendimiento_final_seleccion),
      peso_en_verde_teorico: aNumero(valores.peso_en_verde_teorico),
      peso_verde_final: aNumero(valores.peso_verde_final),
      humedad_inicial_pergamino_bellota: aNumero(valores.humedad_inicial_pergamino_bellota),
      humedad_final_verde: aNumero(valores.humedad_final_verde),
      peso_en_verde_final: aNumero(valores.peso_en_verde_final),
      peso_verde_inferiores: aNumero(valores.peso_verde_inferiores),
      peso_en_verde_final_inferior: aNumero(valores.peso_en_verde_final_inferior),
    };

    for (const { key } of CALIDADES) {
      payload[key] = aNumero(valores[key]);
    }

    setGuardando(true);
    try {
      const resultado = await guardarEtapa(lote.id_lote, "trilla", payload as CuerpoEtapa);
      toast.success(`Trilla guardada — el lote quedó en «${resultado.enproceso}»`);
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
          <CardTitle className="text-base">Trilla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="trilla-fecha">Fecha final del reposo</Label>
            <Input
              id="trilla-fecha"
              type="date"
              value={valores.fecha_final_reposo}
              onChange={(e) => cambiar("fecha_final_reposo", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilla-pruebas">Pruebas físicas de la trilla</Label>
            <Textarea
              id="trilla-pruebas"
              rows={3}
              value={valores.pruebas_fisicas_trilla}
              onChange={(e) => cambiar("pruebas_fisicas_trilla", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trilla-rend-teo-pelado">Rendimiento teórico de pelado</Label>
              <PorcentajeInput
                id="trilla-rend-teo-pelado"
                value={valores.rendimiento_teorico_pelado}
                onChange={(v) => cambiar("rendimiento_teorico_pelado", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trilla-rend-teo-seleccion">Rendimiento teórico de selección</Label>
              <PorcentajeInput
                id="trilla-rend-teo-seleccion"
                value={valores.rendimiento_teorico_seleccion}
                onChange={(v) => cambiar("rendimiento_teorico_seleccion", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trilla-rend-fin-pelado">Rendimiento final de pelado</Label>
              <PorcentajeInput
                id="trilla-rend-fin-pelado"
                value={valores.rendimiento_final_pelado}
                onChange={(v) => cambiar("rendimiento_final_pelado", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trilla-rend-fin-seleccion">Rendimiento final de selección</Label>
              <PorcentajeInput
                id="trilla-rend-fin-seleccion"
                value={valores.rendimiento_final_seleccion}
                onChange={(v) => cambiar("rendimiento_final_seleccion", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso teórico antes de la trilla</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="trilla-peso-teorico">Peso verde teórico</Label>
            <InputConUnidad
              id="trilla-peso-teorico"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_en_verde_teorico}
              onChange={(v) => cambiar("peso_en_verde_teorico", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso verde «sin selección»</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="trilla-peso-verde-final">Peso verde final</Label>
            <InputConUnidad
              id="trilla-peso-verde-final"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_verde_final}
              onChange={(v) => cambiar("peso_verde_final", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mediciones de humedad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trilla-humedad-inicial">Humedad inicial (pergamino/bellota)</Label>
            <InputConUnidad
              id="trilla-humedad-inicial"
              unidad="%"
              min={0}
              max={100}
              step="0.01"
              value={valores.humedad_inicial_pergamino_bellota}
              onChange={(v) => cambiar("humedad_inicial_pergamino_bellota", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilla-humedad-final">Humedad final (verde)</Label>
            <InputConUnidad
              id="trilla-humedad-final"
              unidad="%"
              min={0}
              max={100}
              step="0.01"
              value={valores.humedad_final_verde}
              onChange={(v) => cambiar("humedad_final_verde", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Porcentaje en calidades</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CALIDADES.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`trilla-${key}`}>{label}</Label>
              <PorcentajeInput
                id={`trilla-${key}`}
                value={valores[key]}
                onChange={(v) => cambiar(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso en verde, exportación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="trilla-peso-exportacion">Peso en verde final</Label>
            <InputConUnidad
              id="trilla-peso-exportacion"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_en_verde_final}
              onChange={(v) => cambiar("peso_en_verde_final", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilla-peso-inferiores">Peso en verde inferiores</Label>
            <InputConUnidad
              id="trilla-peso-inferiores"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_verde_inferiores}
              onChange={(v) => cambiar("peso_verde_inferiores", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trilla-peso-final-inferior">Peso en verde final inferior</Label>
            <InputConUnidad
              id="trilla-peso-final-inferior"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_en_verde_final_inferior}
              onChange={(v) => cambiar("peso_en_verde_final_inferior", v)}
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
          Guardar trilla
        </Button>
      </div>
    </form>
  );
}
