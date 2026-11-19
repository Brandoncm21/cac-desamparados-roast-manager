"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputConUnidad } from "@/components/ui/input-unidad";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  guardarEtapa,
  type CuerpoEtapa,
  type EtapaFila,
  type RecibidoLote,
  type ResultadoEtapa,
} from "@/lib/api/beneficio";
import {
  obtenerCatalogosCalificacion,
  type CatalogosCalificacion,
} from "@/lib/api/calificacion";
import {
  calcularTotales,
  equivalenciaDefecto,
  sugerirGradoTostado,
  sugerirGradoVerde,
} from "@/lib/services/calificacion";
import { ApiError, detalleDeError } from "@/lib/api/http";

type DefectoFila = {
  id_defecto: number;
  numero_defectos: number;
};

type Valores = {
  nombre: string;
  codigo: string;
  fecha: string;
  grado: string;
  humedad: string;
  color: string;
  olor: string;
  codigo_muestra_tostado: string;
  quakers: string;
  grado_tostado: string;
};

const hoy = () => {
  const fecha = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
};

function texto(valor: unknown): string {
  return valor == null ? "" : String(valor);
}

function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function aConteo(valor: string): number {
  const n = aNumero(valor);
  return n == null || n < 0 ? 0 : Math.trunc(n);
}

export function FormularioCalificacion({
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
  const [catalogos, setCatalogos] = useState<CatalogosCalificacion | null>(null);
  const [valores, setValores] = useState<Valores>(() => ({
    nombre: texto(initial?.["nombre"]),
    codigo: texto(initial?.["codigo"]),
    fecha: texto(initial?.["fecha"]).slice(0, 10) || hoy(),
    grado: texto(initial?.["grado"]),
    humedad: texto(initial?.["humedad"]),
    color: texto(initial?.["color"]),
    olor: texto(initial?.["olor"]),
    codigo_muestra_tostado: texto(initial?.["codigo_muestra_tostado"]),
    quakers: texto(initial?.["quakers"]),
    grado_tostado: texto(initial?.["grado_tostado"]),
  }));
  const [conteos, setConteos] = useState<Record<number, string>>(() => {
    const filas = Array.isArray(initial?.["defectos"])
      ? (initial?.["defectos"] as DefectoFila[])
      : [];
    const inicial: Record<number, string> = {};
    for (const fila of filas) {
      inicial[fila.id_defecto] = String(fila.numero_defectos ?? 0);
    }
    return inicial;
  });
  const [gradoManual, setGradoManual] = useState(Boolean(initial?.["grado"]));
  const [gradoTostadoManual, setGradoTostadoManual] = useState(
    Boolean(initial?.["grado_tostado"])
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerCatalogosCalificacion()
      .then(setCatalogos)
      .catch((error) => toast.error(detalleDeError(error)));
  }, []);

  const cambiar = (key: keyof Valores, valor: string) => {
    setValores((prev) => ({ ...prev, [key]: valor }));
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _omitido, ...resto } = prev;
      return resto;
    });
  };

  const defectosVerdes = useMemo(
    () =>
      (catalogos?.defectos ?? [])
        .filter((d) => d.tipo_cafe === "verde")
        .sort((a, b) => a.orden - b.orden),
    [catalogos]
  );

  const calculo = useMemo(
    () =>
      defectosVerdes.map((defecto) => {
        const conteo = aConteo(conteos[defecto.id_defecto] ?? "");
        return {
          id_defecto: defecto.id_defecto,
          categoria: (defecto.categoria ?? 2) as 1 | 2,
          proporcion: defecto.proporcion,
          numero_defectos: conteo,
          equivalencia: equivalenciaDefecto(conteo, defecto.proporcion),
        };
      }),
    [defectosVerdes, conteos]
  );

  const totales = useMemo(() => calcularTotales(calculo), [calculo]);
  const sugeridoVerde = sugerirGradoVerde(totales.totalEquivalencia, totales.cat1Defectos);
  const quakers = aNumero(valores.quakers);
  const sugeridoTostado = sugerirGradoTostado(quakers);
  const gradoEfectivo = gradoManual ? valores.grado : sugeridoVerde;
  const gradoTostadoEfectivo = gradoTostadoManual
    ? valores.grado_tostado
    : sugeridoTostado;

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrores({});

    const payload = {
      nombre: valores.nombre.trim() || null,
      codigo: valores.codigo.trim() || null,
      fecha: valores.fecha || null,
      grado: gradoEfectivo || null,
      humedad: aNumero(valores.humedad),
      color: valores.color || null,
      olor: valores.olor || null,
      codigo_muestra_tostado: valores.codigo_muestra_tostado.trim() || null,
      quakers: aNumero(valores.quakers),
      grado_tostado: gradoTostadoEfectivo || null,
      defectos: calculo.map((d) => ({
        id_defecto: d.id_defecto,
        numero_defectos: d.numero_defectos,
      })),
    };

    setGuardando(true);
    try {
      const resultado = await guardarEtapa(
        lote.id_lote,
        "calificacion",
        payload as CuerpoEtapa
      );
      toast.success(`Hoja guardada — el lote quedó en «${resultado.enproceso}»`);
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

  if (!catalogos) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando catálogo…</p>
      </div>
    );
  }

  const categorias = [1, 2].map((categoria) => ({
    categoria,
    defectos: defectosVerdes.filter((d) => d.categoria === categoria),
  }));

  return (
    <form onSubmit={enviar} className="space-y-6">
      {Object.keys(errores).length > 0 && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {Object.values(errores)[0]}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cal-nombre">Nombre</Label>
            <Input id="cal-nombre" value={valores.nombre} onChange={(e) => cambiar("nombre", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-codigo">Código</Label>
            <Input id="cal-codigo" value={valores.codigo} onChange={(e) => cambiar("codigo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-fecha">Fecha</Label>
            <Input id="cal-fecha" type="date" value={valores.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Grado</Label>
            <Select
              value={gradoEfectivo}
              onValueChange={(v) => {
                setGradoManual(true);
                cambiar("grado", v ?? "");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sugerido al capturar" /></SelectTrigger>
              <SelectContent>
                {catalogos.grados.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-total">Total</Label>
            <Input id="cal-total" readOnly value={totales.totalEquivalencia.toFixed(2)} />
            <p className="text-xs text-muted-foreground">Total de equivalencia de café verde</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-humedad">Humedad</Label>
            <InputConUnidad
              id="cal-humedad"
              unidad="%"
              min={0}
              max={100}
              step="0.01"
              value={valores.humedad}
              onChange={(v) => cambiar("humedad", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Café verde</CardTitle>
          <p className="text-xs text-muted-foreground">Tipo de defecto · muestra 350 g</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[1fr_7rem_8rem] gap-2 border-b border-outline-variant px-1 pb-2 text-xs font-semibold text-muted-foreground">
                <span>Tipo de defecto</span>
                <span className="text-right">Número de defectos</span>
                <span className="text-right">Equivalencia</span>
              </div>

              {categorias.map(({ categoria, defectos }) => (
                <div key={categoria}>
                  <div className="mt-3 rounded-md bg-surface-container px-2 py-1 text-xs font-semibold">
                    Categoría {categoria}
                  </div>
                  {defectos.map((defecto) => {
                    const fila = calculo.find((d) => d.id_defecto === defecto.id_defecto);
                    return (
                      <div
                        key={defecto.id_defecto}
                        className="grid grid-cols-[1fr_7rem_8rem] items-center gap-2 border-b border-outline-variant/50 px-1 py-1.5"
                      >
                        <span className="text-sm">{defecto.nombre}</span>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          className="h-9 text-right"
                          value={conteos[defecto.id_defecto] ?? ""}
                          onChange={(e) =>
                            setConteos((prev) => ({
                              ...prev,
                              [defecto.id_defecto]: e.target.value,
                            }))
                          }
                          aria-label={`Número de defectos: ${defecto.nombre}`}
                        />
                        <span className="text-right font-mono text-sm">
                          <span className="mr-2 text-xs text-muted-foreground">{defecto.proporcion}:1</span>
                          {(fila?.equivalencia ?? 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="grid grid-cols-[1fr_7rem_8rem] gap-2 bg-surface-container px-1 py-2 text-sm font-semibold">
                <span>Total</span>
                <span className="text-right font-mono">{totales.totalDefectos}</span>
                <span className="text-right font-mono">{totales.totalEquivalencia.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={valores.color} onValueChange={(v) => cambiar("color", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccione color" /></SelectTrigger>
                <SelectContent>
                  {catalogos.colores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Olor</Label>
              <Select value={valores.olor} onValueChange={(v) => cambiar("olor", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccione olor" /></SelectTrigger>
                <SelectContent>
                  {catalogos.olores.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Café tostado</CardTitle>
          <p className="text-xs text-muted-foreground">Muestra 100 g</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-1.5">
            <Label htmlFor="cal-codigo-muestra">Código de la muestra</Label>
            <Input
              id="cal-codigo-muestra"
              value={valores.codigo_muestra_tostado}
              onChange={(e) => cambiar("codigo_muestra_tostado", e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[1fr_7rem_9rem] gap-2 border-b border-outline-variant px-1 pb-2 text-xs font-semibold text-muted-foreground">
                <span>Tipo de defecto</span>
                <span className="text-right">Número de defectos</span>
                <span>Grado</span>
              </div>
              <div className="grid grid-cols-[1fr_7rem_9rem] items-center gap-2 border-b border-outline-variant/50 px-1 py-1.5">
                <span className="text-sm">Quaker (café inmaduro)</span>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  className="h-9 text-right"
                  value={valores.quakers}
                  onChange={(e) => cambiar("quakers", e.target.value)}
                  aria-label="Número de quakers"
                />
                <Select
                  value={gradoTostadoEfectivo}
                  onValueChange={(v) => {
                    setGradoTostadoManual(true);
                    cambiar("grado_tostado", v ?? "");
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Grado" /></SelectTrigger>
                  <SelectContent>
                    {catalogos.grados.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_7rem_9rem] gap-2 bg-surface-container px-1 py-2 text-sm font-semibold">
                <span>Total</span>
                <span className="text-right font-mono">{quakers ?? 0}</span>
                <span>{gradoTostadoEfectivo}</span>
              </div>
            </div>
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
          Guardar hoja
        </Button>
      </div>
    </form>
  );
}
