"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputConUnidad } from "@/components/ui/input-unidad";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProcesoSelect } from "@/components/beneficio/proceso-select";
import {
  guardarEtapa,
  type CuerpoEtapa,
  type EtapaFila,
  type RecibidoLote,
  type ResultadoEtapa,
} from "@/lib/api/beneficio";
import { calcularPorcentajesMaduracion, promedioBx } from "@/lib/services/beneficio";
import { ApiError, detalleDeError } from "@/lib/api/http";

const CONTEO_CEREZAS = [
  { key: "cerezas_verdes", label: "Cerezas verdes" },
  { key: "cerezas_semimaduras", label: "Cerezas inmaduras o semimaduras" },
  { key: "cerezas_en_objetivo", label: "Cerezas en objetivo" },
  { key: "cerezas_sobremaduras", label: "Cerezas sobremaduras" },
  { key: "cerezas_secas", label: "Cerezas secas" },
] as const;

const REFRACTOMETRO = [
  { prefijo: "madura", titulo: "Cerezas maduras" },
  { prefijo: "semimadura", titulo: "Cerezas inmaduras" },
  { prefijo: "sobremadura", titulo: "Cerezas sobremaduras" },
] as const;

const LECTURAS = [1, 2, 3, 4, 5] as const;

interface Valores {
  fecha_hora: string;
  proceso: string;
  proceso_otro: string;
  cerezas_verdes: string;
  cerezas_semimaduras: string;
  cerezas_en_objetivo: string;
  cerezas_sobremaduras: string;
  cerezas_secas: string;
  semimadura_1: string;
  semimadura_2: string;
  semimadura_3: string;
  semimadura_4: string;
  semimadura_5: string;
  madura_1: string;
  madura_2: string;
  madura_3: string;
  madura_4: string;
  madura_5: string;
  sobremadura_1: string;
  sobremadura_2: string;
  sobremadura_3: string;
  sobremadura_4: string;
  sobremadura_5: string;
  observaciones_aspecto_textura: string;
  densidad_g_ml: string;
  g_vanos: string;
  g_secos: string;
  g_broca: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function ahoraLocal(): string {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(
    fecha.getHours()
  )}:${pad(fecha.getMinutes())}`;
}

function fechaLocal(valor: unknown): string {
  if (!valor) return ahoraLocal();
  const fecha = new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return ahoraLocal();
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(
    fecha.getHours()
  )}:${pad(fecha.getMinutes())}`;
}

function textoANumero(texto: string | undefined): number | null {
  if (texto == null || texto.trim() === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

function construirValores(lote: RecibidoLote, fila: EtapaFila | null): Valores {
  const valores = {} as Valores;

  valores.fecha_hora = fechaLocal(fila?.["fecha_hora"]);
  valores.proceso = String(fila?.["proceso"] ?? lote.proceso ?? "");
  valores.proceso_otro = String(fila?.["proceso_otro"] ?? lote.proceso_otro ?? "");
  valores.observaciones_aspecto_textura = String(fila?.["observaciones_aspecto_textura"] ?? "");
  valores.densidad_g_ml = fila?.["densidad_g_ml"] != null ? String(fila["densidad_g_ml"]) : "";
  valores.g_vanos = fila?.["g_vanos"] != null ? String(fila["g_vanos"]) : "";
  valores.g_secos = fila?.["g_secos"] != null ? String(fila["g_secos"]) : "";
  valores.g_broca = fila?.["g_broca"] != null ? String(fila["g_broca"]) : "";

  for (const { key } of CONTEO_CEREZAS) {
    valores[key] = fila?.[key] != null ? String(fila[key]) : "";
  }
  for (const { prefijo } of REFRACTOMETRO) {
    for (const n of LECTURAS) {
      const key = `${prefijo}_${n}` as keyof Valores;
      valores[key] = fila?.[key] != null ? String(fila[key]) : "";
    }
  }

  return valores;
}

export function FormularioCaracterizacion({
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
  const [valores, setValores] = useState<Valores>(() => construirValores(lote, initial));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cambiar = (key: string, valor: string) => {
    setValores((prev) => ({ ...prev, [key]: valor }));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _omitido, ...resto } = prev;
      return resto;
    });
  };

  const conteos = useMemo(
    () => ({
      cerezas_verdes: textoANumero(valores.cerezas_verdes),
      cerezas_semimaduras: textoANumero(valores.cerezas_semimaduras),
      cerezas_en_objetivo: textoANumero(valores.cerezas_en_objetivo),
      cerezas_sobremaduras: textoANumero(valores.cerezas_sobremaduras),
      cerezas_secas: textoANumero(valores.cerezas_secas),
    }),
    [
      valores.cerezas_verdes,
      valores.cerezas_semimaduras,
      valores.cerezas_en_objetivo,
      valores.cerezas_sobremaduras,
      valores.cerezas_secas,
    ]
  );

  const porcentajes = useMemo(() => calcularPorcentajesMaduracion(conteos), [conteos]);

  const promedios = useMemo(() => {
    const resultado: Record<string, number | null> = {};
    for (const { prefijo } of REFRACTOMETRO) {
      resultado[prefijo] = promedioBx(
        LECTURAS.map((n) => textoANumero(valores[`${prefijo}_${n}`]))
      );
    }
    return resultado;
  }, [valores]);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrores({});

    if (valores.proceso === "Otro" && valores.proceso_otro.trim() === "") {
      setErrores({ proceso_otro: "Especifique el proceso" });
      return;
    }

    const fecha = new Date(valores.fecha_hora);
    const payload: Record<string, unknown> = {
      fecha_hora: Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString(),
      proceso: valores.proceso || null,
      proceso_otro: valores.proceso === "Otro" ? valores.proceso_otro.trim() : null,
      observaciones_aspecto_textura: valores.observaciones_aspecto_textura.trim() || null,
      densidad_g_ml: textoANumero(valores.densidad_g_ml),
      g_vanos: textoANumero(valores.g_vanos),
      g_secos: textoANumero(valores.g_secos),
      g_broca: textoANumero(valores.g_broca),
    };

    for (const { key } of CONTEO_CEREZAS) {
      payload[key] = textoANumero(valores[key]);
    }
    for (const { prefijo } of REFRACTOMETRO) {
      for (const n of LECTURAS) {
        payload[`${prefijo}_${n}`] = textoANumero(valores[`${prefijo}_${n}`]);
      }
      payload[`${prefijo}_bx_promedio`] = promedios[prefijo];
    }

    setGuardando(true);
    try {
      const resultado = await guardarEtapa(
        lote.id_lote,
        "caracterizacion",
        payload as CuerpoEtapa
      );
      toast.success(`Caracterización guardada — el lote quedó en «${resultado.enproceso}»`);
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales del lote</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="caracterizacion-lote">Lote asignado</Label>
            <Input
              id="caracterizacion-lote"
              value={`${lote.numero_lote} — ${lote.numero_recibo}`}
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caracterizacion-fecha">Fecha y hora</Label>
            <Input
              id="caracterizacion-fecha"
              type="datetime-local"
              value={valores.fecha_hora}
              onChange={(e) => cambiar("fecha_hora", e.target.value)}
            />
          </div>
          <ProcesoSelect
            value={valores.proceso}
            onChange={(v) => cambiar("proceso", v)}
            procesoOtro={valores.proceso_otro}
            onProcesoOtroChange={(v) => cambiar("proceso_otro", v)}
            error={errores["proceso"]}
            errorOtro={errores["proceso_otro"]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clasificación de cerezas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTEO_CEREZAS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`caracterizacion-${key}`}>{label}</Label>
              <Input
                id={`caracterizacion-${key}`}
                type="number"
                min={0}
                step="1"
                value={valores[key] ?? ""}
                onChange={(e) => cambiar(key, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {conteos[key] != null ? `${porcentajes[key]} % del total` : "—"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caracterización de materia prima</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="caracterizacion-densidad">Densidad</Label>
            <InputConUnidad
              id="caracterizacion-densidad"
              unidad="g/ml"
              min={0}
              step="0.001"
              value={valores.densidad_g_ml}
              onChange={(v) => cambiar("densidad_g_ml", v)}
            />
          </div>

          <div className="rounded-xl border-2 border-outline-variant bg-surface-container-low p-4">
            <h3 className="mb-4 text-sm font-semibold">Flotación (500 g)</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="caracterizacion-g-vanos">Granos vanos</Label>
                <InputConUnidad
                  id="caracterizacion-g-vanos"
                  unidad="g"
                  min={0}
                  step="0.01"
                  value={valores.g_vanos}
                  onChange={(v) => cambiar("g_vanos", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caracterizacion-g-secos">Granos secos</Label>
                <InputConUnidad
                  id="caracterizacion-g-secos"
                  unidad="g"
                  min={0}
                  step="0.01"
                  value={valores.g_secos}
                  onChange={(v) => cambiar("g_secos", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caracterizacion-g-broca">Granos con broca</Label>
                <InputConUnidad
                  id="caracterizacion-g-broca"
                  unidad="g"
                  min={0}
                  step="0.01"
                  value={valores.g_broca}
                  onChange={(v) => cambiar("g_broca", v)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de refractómetro (°Bx)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {REFRACTOMETRO.map(({ prefijo, titulo }) => (
            <div key={prefijo} className="rounded-xl border-2 border-outline-variant p-4">
              <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
              <div className="space-y-2">
                {LECTURAS.map((n) => {
                  const key = `${prefijo}_${n}`;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Label htmlFor={`caracterizacion-${key}`} className="w-20 shrink-0 text-xs">
                        Lectura {n}
                      </Label>
                      <InputConUnidad
                        id={`caracterizacion-${key}`}
                        unidad="°Bx"
                        min={0}
                        step="0.01"
                        value={valores[key as keyof Valores] ?? ""}
                        onChange={(v) => cambiar(key as keyof Valores, v)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md bg-surface-container px-3 py-2">
                <span className="text-xs text-muted-foreground">Promedio</span>
                <span className="font-mono text-sm font-semibold">
                  {promedios[prefijo] != null ? `${promedios[prefijo]} °Bx` : "—"}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="caracterizacion-observaciones" className="sr-only">
            Observaciones generales
          </Label>
          <Textarea
            id="caracterizacion-observaciones"
            rows={4}
            placeholder="Observaciones de aspecto, textura u otras notas"
            value={valores.observaciones_aspecto_textura}
            onChange={(e) => cambiar("observaciones_aspecto_textura", e.target.value)}
          />
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
          Guardar caracterización
        </Button>
      </div>
    </form>
  );
}
