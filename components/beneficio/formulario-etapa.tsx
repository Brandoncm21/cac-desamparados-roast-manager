"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  seccionesDeEtapa,
  type CampoEtapa,
  type EtapaNombre,
} from "@/lib/beneficio/campos";
import {
  guardarEtapa,
  type CuerpoEtapa,
  type EtapaFila,
  type ResultadoEtapa,
} from "@/lib/api/beneficio";
import { ApiError, detalleDeError } from "@/lib/api/http";

interface FormularioEtapaProps {
  etapa: EtapaNombre;
  idLote: number;
  initial: EtapaFila | null;
  onSaved: (resultado: ResultadoEtapa) => void;
  onCancel?: () => void;
}

type Valores = Record<string, string | boolean>;

function valorInicial(campo: CampoEtapa, fila: EtapaFila | null): string | boolean {
  const crudo = fila?.[campo.key];
  if (campo.tipo === "booleano") return Boolean(crudo);
  if (crudo == null) return "";
  if (campo.tipo === "fecha") return String(crudo).slice(0, 10);
  if (campo.tipo === "fechaHora") {
    const fecha = new Date(String(crudo));
    if (Number.isNaN(fecha.getTime())) return String(crudo).slice(0, 16);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(
      fecha.getHours()
    )}:${pad(fecha.getMinutes())}`;
  }
  return String(crudo);
}

function construirValores(etapa: EtapaNombre, fila: EtapaFila | null): Valores {
  const valores: Valores = {};
  for (const campo of seccionesDeEtapa(etapa).flatMap((s) => s.campos)) {
    valores[campo.key] = valorInicial(campo, fila);
  }
  return valores;
}

function aPayload(etapa: EtapaNombre, valores: Valores): CuerpoEtapa {
  const payload: Record<string, unknown> = {};

  for (const campo of seccionesDeEtapa(etapa).flatMap((s) => s.campos)) {
    const valor = valores[campo.key];

    if (campo.tipo === "booleano") {
      payload[campo.key] = Boolean(valor);
      continue;
    }

    const texto = String(valor ?? "").trim();
    if (texto === "") {
      payload[campo.key] = campo.tipo === "numero" ? undefined : "";
      continue;
    }

    if (campo.tipo === "fechaHora") {
      const fecha = new Date(texto);
      payload[campo.key] = Number.isNaN(fecha.getTime()) ? texto : fecha.toISOString();
      continue;
    }

    payload[campo.key] = campo.tipo === "numero" ? Number(texto) : texto;
  }

  return payload as CuerpoEtapa;
}

export function FormularioEtapa({
  etapa,
  idLote,
  initial,
  onSaved,
  onCancel,
}: FormularioEtapaProps) {
  const secciones = useMemo(() => seccionesDeEtapa(etapa), [etapa]);
  const [valores, setValores] = useState<Valores>(() => construirValores(etapa, initial));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cambiar = (key: string, valor: string | boolean) => {
    setValores((prev) => ({ ...prev, [key]: valor }));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _omitido, ...resto } = prev;
      return resto;
    });
  };

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setErrores({});

    try {
      const resultado = await guardarEtapa(idLote, etapa, aPayload(etapa, valores));
      toast.success(`Etapa guardada — el lote quedó en «${resultado.enproceso}»`);
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
      {secciones.map((seccion) => (
        <fieldset key={seccion.titulo} className="space-y-3">
          <legend className="text-sm font-semibold text-on-surface">{seccion.titulo}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {seccion.campos.map((campo) => {
              const id = `${etapa}-${campo.key}`;
              const error = errores[campo.key];

              if (campo.tipo === "booleano") {
                return (
                  <div key={campo.key} className="flex items-start gap-3 sm:col-span-2">
                    <Checkbox
                      id={id}
                      checked={Boolean(valores[campo.key])}
                      onCheckedChange={(valor) => cambiar(campo.key, Boolean(valor))}
                    />
                    <div>
                      <Label htmlFor={id} className="font-normal">
                        {campo.label}
                      </Label>
                      {campo.ayuda && (
                        <p className="text-xs text-muted-foreground">{campo.ayuda}</p>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={campo.key}
                  className={campo.tipo === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                >
                  <Label htmlFor={id}>
                    {campo.label}
                    {campo.unidad ? ` (${campo.unidad})` : ""}
                    {campo.requerido && <span className="text-destructive"> *</span>}
                  </Label>

                  {campo.tipo === "textarea" ? (
                    <Textarea
                      id={id}
                      value={String(valores[campo.key] ?? "")}
                      onChange={(e) => cambiar(campo.key, e.target.value)}
                      rows={3}
                      aria-invalid={Boolean(error)}
                    />
                  ) : (
                    <Input
                      id={id}
                      type={
                        campo.tipo === "numero"
                          ? "number"
                          : campo.tipo === "fecha"
                            ? "date"
                            : campo.tipo === "fechaHora"
                              ? "datetime-local"
                              : "text"
                      }
                      inputMode={campo.tipo === "numero" ? "decimal" : undefined}
                      step={campo.step}
                      min={campo.min}
                      max={campo.max}
                      value={String(valores[campo.key] ?? "")}
                      onChange={(e) => cambiar(campo.key, e.target.value)}
                      aria-invalid={Boolean(error)}
                    />
                  )}

                  {campo.ayuda && !error && (
                    <p className="text-xs text-muted-foreground">{campo.ayuda}</p>
                  )}
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={guardando}>
          {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar etapa
        </Button>
      </div>
    </form>
  );
}
