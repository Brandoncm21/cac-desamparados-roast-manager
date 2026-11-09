"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { toLocalInput, localNow } from "./caracterizacion-panel";

interface SerieItem { id?: number; fecha?: string; [k: string]: unknown }
interface Secado {
  id_secado?: number;
  finicio: string;
  ffinal: string | null;
  dsecado: number | null;
  humedades: SerieItem[];
  ambientes: SerieItem[];
  temperaturas: SerieItem[];
  camas: SerieItem[];
}

const SERIES_META = [
  { key: "humedades", titulo: "💧 Mediciones de Humedad (%)", campo: "humedad", step: "0.01", extra: null as null },
  { key: "ambientes", titulo: "🌡️ Termo-Higrometría", campo: "temperatura", step: "0.1", extra: "humedad_ambiente" },
  { key: "temperaturas", titulo: "🔥 Temperaturas de Secado (°C)", campo: "temperatura", step: "0.1", extra: null },
] as const;

export function SecadoPanel({ loteId, editable }: { loteId: string; editable: boolean }) {
  const [lista, setLista] = useState<Secado[]>([]);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/lotes/${loteId}/secado`);
      const result = await res.json();
      setLista(res.ok ? result.data : []);
      setCargando(false);
    })();
  }, [loteId]);

  const activo = lista[indice] ?? {
    finicio: localNow(),
    ffinal: null,
    dsecado: null,
    humedades: [],
    ambientes: [],
    temperaturas: [],
    camas: [],
  } as Secado;

  const updField = (k: string, v: unknown) =>
    setLista((prev) => {
      const next = [...prev];
      next[indice] = { ...activo, [k]: v };
      return next;
    });

  const updSerie = (key: "humedades" | "ambientes" | "temperaturas" | "camas", items: SerieItem[]) =>
    updField(key, items);

  const agregar = () =>
    setLista((prev) => [...prev, {
      finicio: localNow(), ffinal: null, dsecado: null,
      humedades: [], ambientes: [], temperaturas: [], camas: [],
    }] as Secado[]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const payload = {
        secado: {
          id_secado: activo.id_secado,
          finicio: toLocalInput(activo.finicio) || activo.finicio,
          ffinal: toLocalInput(activo.ffinal ?? "") || "",
        },
        humedades: activo.humedades ?? [],
        ambientes: activo.ambientes ?? [],
        temperaturas: activo.temperaturas ?? [],
        camas: activo.camas ?? [],
      };
      const res = await fetch(`/api/lotes/${loteId}/secado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error("Error al guardar: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Secado guardado");
      const res2 = await fetch(`/api/lotes/${loteId}/secado`);
      setResultAndFocus(await res2.json());
    } finally {
      setGuardando(false);
    }
  };

  const setResultAndFocus = (result: { data?: Secado[] }) => {
    setLista((result.data ?? []) as Secado[]);
    const encontre = (result.data ?? []).findIndex((s) => (s.id_secado != null));
    setIndice(encontre >= 0 ? encontre : 0);
  };

  const dias = (() => {
    if (!activo.finicio) return null;
    const ini = new Date(activo.finicio).getTime();
    if (Number.isNaN(ini)) return null;
    const fin = activo.ffinal ? new Date(activo.ffinal).getTime() : null;
    if (fin == null || fin <= ini) return null;
    return Math.ceil((fin - ini) / 86_400_000);
  })();

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando secado...</p>;

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lista.map((s, i) => (
            <Button key={s.id_secado ?? i} variant={i === indice ? "secondary" : "outline"} size="sm"
              onClick={() => setIndice(i)}>
              Secado #{i + 1}{s.dsecado != null ? ` · ${s.dsecado}d` : ""}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Información Principal de Secado</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sec-inicio">Fecha/Hora inicio *</Label>
            <Input id="sec-inicio" type="datetime-local" disabled={!editable}
              value={toLocalInput(activo.finicio) ?? ""}
              onChange={(e) => updField("finicio", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sec-fin">Fecha/Hora fin</Label>
            <Input id="sec-fin" type="datetime-local" disabled={!editable}
              value={toLocalInput(activo.ffinal) ?? ""}
              onChange={(e) => updField("ffinal", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sec-dias">Días de secado</Label>
            <Input id="sec-dias" value={dias != null ? String(dias) : (activo.dsecado ?? "")} disabled readOnly />
          </div>
        </CardContent>
      </Card>

      {SERIES_META.map(({ key, titulo, campo, step, extra }) => (
        <Card key={key}>
          <CardHeader><CardTitle>{titulo}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(activo[key] as SerieItem[] | undefined ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No hay mediciones registradas.</p>
            )}
            {(activo[key] as SerieItem[] ?? []).map((item, i) => (
              <div key={item.id ?? `nuevo-${i}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="datetime-local" disabled={!editable}
                    value={toLocalInput(item.fecha) ?? ""}
                    onChange={(e) => {
                      const arr = [...(activo[key] as SerieItem[])];
                      arr[i] = { ...item, fecha: e.target.value };
                      updSerie(key, arr);
                    }} />
                </div>
                <div className="space-y-1">
                  <Label>{extra === "humedad_ambiente" ? "Temperatura (°C)" : "Valor"}</Label>
                  <Input type="number" step={step} disabled={!editable}
                    value={(item[campo] as number ?? "") as string | number}
                    onChange={(e) => {
                      const arr = [...(activo[key] as SerieItem[])];
                      arr[i] = { ...item, [campo]: e.target.valueAsNumber || "" };
                      updSerie(key, arr);
                    }} />
                </div>
                {extra && (
                  <div className="space-y-1">
                    <Label>Humedad ambiente (%)</Label>
                    <Input type="number" step="0.1" disabled={!editable}
                      value={(item[extra] as number ?? "") as string | number}
                      onChange={(e) => {
                        const arr = [...(activo[key] as SerieItem[])];
                        arr[i] = { ...item, [extra]: e.target.valueAsNumber || "" };
                        updSerie(key, arr);
                      }} />
                  </div>
                )}
                {editable && (
                  <Button variant="ghost" size="icon" aria-label="Quitar medición"
                    onClick={() => updSerie(key, (activo[key] as SerieItem[]).filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {editable && (
              <Button variant="outline" size="sm"
                onClick={() => updSerie(key, [...(activo[key] as SerieItem[] ?? []), { fecha: localNow(), [campo]: "" } as SerieItem])}>
                <Plus className="h-4 w-4 mr-1" /> Agregar medición
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>🛏️ Números de Cama (Distribución)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(activo.camas ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sin camas asignadas.</p>
          )}
          {(activo.camas ?? []).map((c, i) => (
            <div key={c.id ?? `cama-${i}`} className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label>N° de cama</Label>
                <Input maxLength={50} disabled={!editable} value={String(c["numero_cama"] ?? "")}
                  onChange={(e) => {
                    const arr = [...activo.camas];
                    arr[i] = { ...c, numero_cama: e.target.value };
                    updSerie("camas", arr);
                  }} />
              </div>
              {editable && (
                <Button variant="ghost" size="icon"
                  onClick={() => updSerie("camas", activo.camas.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {editable && (
            <Button variant="outline" size="sm"
              onClick={() => updSerie("camas", [...(activo.camas ?? []), { numero_cama: "" } as SerieItem])}>
              <Plus className="h-4 w-4 mr-1" /> Agregar cama
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {editable && (
          <Button variant="outline" onClick={agregar}><Plus className="h-4 w-4 mr-1" /> Nuevo proceso de secado</Button>
        )}
        {editable && (
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar secado"}
          </Button>
        )}
      </div>
    </div>
  );
}
