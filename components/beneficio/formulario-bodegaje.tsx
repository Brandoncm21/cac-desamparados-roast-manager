"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputConUnidad } from "@/components/ui/input-unidad";
import { Label } from "@/components/ui/label";
import {
  guardarEtapa,
  type CuerpoEtapa,
  type EtapaFila,
  type RecibidoLote,
  type ResultadoEtapa,
} from "@/lib/api/beneficio";
import { ApiError, detalleDeError } from "@/lib/api/http";

interface Valores {
  inicio_reposo: string;
  cantidad_sacos: string;
  peso_pergamino: string;
  peso_bellota: string;
  humedad_inicial: string;
  humedad_final: string;
}

function texto(valor: unknown): string {
  return valor == null ? "" : String(valor);
}

function construirValores(fila: EtapaFila | null): Valores {
  return {
    inicio_reposo: texto(fila?.["inicio_reposo"]).slice(0, 10),
    cantidad_sacos: texto(fila?.["cantidad_sacos"]),
    peso_pergamino: texto(fila?.["peso_pergamino"]),
    peso_bellota: texto(fila?.["peso_bellota"]),
    humedad_inicial: texto(fila?.["humedad_inicial"]),
    humedad_final: texto(fila?.["humedad_final"]),
  };
}

function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function FormularioBodegaje({
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
      inicio_reposo: valores.inicio_reposo || null,
      cantidad_sacos: aNumero(valores.cantidad_sacos),
      peso_pergamino: aNumero(valores.peso_pergamino),
      peso_bellota: aNumero(valores.peso_bellota),
      humedad_inicial: aNumero(valores.humedad_inicial),
      humedad_final: aNumero(valores.humedad_final),
    };

    setGuardando(true);
    try {
      const resultado = await guardarEtapa(lote.id_lote, "bodegaje", payload as CuerpoEtapa);
      toast.success(`Bodegaje guardado — el lote quedó en «${resultado.enproceso}»`);
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
          <CardTitle className="text-base">Bodegaje</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bodegaje-inicio">Inicio de reposo</Label>
            <Input
              id="bodegaje-inicio"
              type="date"
              value={valores.inicio_reposo}
              onChange={(e) => cambiar("inicio_reposo", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bodegaje-sacos">Cantidad de sacos</Label>
            <Input
              id="bodegaje-sacos"
              type="number"
              min={0}
              step="1"
              value={valores.cantidad_sacos}
              onChange={(e) => cambiar("cantidad_sacos", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bodegaje-peso-pergamino">Peso pergamino</Label>
            <InputConUnidad
              id="bodegaje-peso-pergamino"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_pergamino}
              onChange={(v) => cambiar("peso_pergamino", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bodegaje-peso-bellota">Peso bellota</Label>
            <InputConUnidad
              id="bodegaje-peso-bellota"
              unidad="kg"
              min={0}
              step="0.01"
              value={valores.peso_bellota}
              onChange={(v) => cambiar("peso_bellota", v)}
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
            <Label htmlFor="bodegaje-humedad-inicial">Humedad inicial</Label>
            <InputConUnidad
              id="bodegaje-humedad-inicial"
              unidad="%"
              min={0}
              max={100}
              step="0.01"
              value={valores.humedad_inicial}
              onChange={(v) => cambiar("humedad_inicial", v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bodegaje-humedad-final">Humedad final</Label>
            <InputConUnidad
              id="bodegaje-humedad-final"
              unidad="%"
              min={0}
              max={100}
              step="0.01"
              value={valores.humedad_final}
              onChange={(v) => cambiar("humedad_final", v)}
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
          Guardar bodegaje
        </Button>
      </div>
    </form>
  );
}
