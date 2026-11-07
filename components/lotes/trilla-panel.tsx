"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { toLocalInput, localNow } from "./caracterizacion-panel";

interface Trilla {
  id_trilla?: number;
  ffinal_reposo: string | null;
  hinicial: number | null;
  hfinal: number | null;
  rfinal_pelado: number | null;
  rfinal_seleccion: number | null;
  rteorico_pelado: number | null;
  rteorico_seleccion: number | null;
  wverde_teorico: number | null;
  wverde_final: number | null;
  psegundas: number | null;
  pcataduras: number | null;
  pbarreduras: number | null;
  pescogeduras: number | null;
  pcaracolillo: number | null;
  pprimera: number | null;
  pmadres: number | null;
  pmenudos: number | null;
  pinferiores: number | null;
}

const SECC_1: Array<[keyof Partial<Trilla>, string]> = [
  ["hinicial", "Humedad Inicial (%)"],
  ["hfinal", "Humedad Final (%)"],
  ["rfinal_pelado", "Rendimiento Final Pelado (%)"],
  ["rfinal_seleccion", "Rendimiento Final Selección (%)"],
  ["rteorico_pelado", "Rendimiento Teórico Pelado (%)"],
  ["rteorico_seleccion", "Rendimiento Teórico Selección (%)"],
];

const SECC_WVERDE: Array<[keyof Partial<Trilla>, string]> = [
  ["wverde_teorico", "Peso Verde Teórico (kg)"],
  ["wverde_final", "Peso Verde Final (kg)"],
];

const SECC_CLASIF: Array<[keyof Partial<Trilla>, string]> = [
  ["pprimera", "Primera (%)"],
  ["psegundas", "Segundas (%)"],
  ["pcaracolillo", "Caracolillo (%)"],
  ["pmadres", "Madres (%)"],
  ["pmenudos", "Menudos (%)"],
  ["pinferiores", "Inferiores (%)"],
  ["pcataduras", "Cataduras (%)"],
  ["pbarreduras", "Barreduras (%)"],
  ["pescogeduras", "Escogeduras (%)"],
];

export function TrillaPanel({ loteId, editable }: { loteId: string; editable: boolean }) {
  const [lista, setLista] = useState<Array<Trilla & { peso_verde_trilla: { wfinal: number | null; winferiores: number | null; wfinal_inferiores: number | null } | null }>>([]);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [pvOn, setPvOn] = useState(false);
  const [pv, setPv] = useState({ wfinal: "" as string | number, winferiores: "" as string | number, wfinal_inferiores: "" as string | number });

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/lotes/${loteId}/trilla`);
      const result = await res.json();
      const data = res.ok ? (result.data ?? []) : [];
      setLista(data);
      if (data[0]?.peso_verde_trilla) {
        setPvOn(true);
        setPv({
          wfinal: data[0].peso_verde_trilla.wfinal ?? "",
          winferiores: data[0].peso_verde_trilla.winferiores ?? "",
          wfinal_inferiores: data[0].peso_verde_trilla.wfinal_inferiores ?? "",
        });
      }
      setCargando(false);
    })();
  }, [loteId]);

  const activo = lista[indice] ?? {
    ffinal_reposo: localNow(), hinicial: null, hfinal: null,
    rfinal_pelado: null, rfinal_seleccion: null, rteorico_pelado: null, rteorico_seleccion: null,
    wverde_teorico: null, wverde_final: null,
    psegundas: null, pcataduras: null, pbarreduras: null, pescogeduras: null,
    pcaracolillo: null, pprimera: null, pmadres: null, pmenudos: null, pinferiores: null,
    peso_verde_trilla: null,
  } as Trilla & { peso_verde_trilla: null };

  const upd = (k: keyof Partial<Trilla>, v: string | number) =>
    setLista((prev) => {
      const next = [...prev];
      next[indice] = { ...activo, [k]: v === "" ? null : v };
      return next;
    });

  const guardar = async () => {
    setGuardando(true);
    try {
      const payload = {
        trilla: Object.fromEntries(
          Object.entries(activo).filter(([k, v]) => k !== "peso_verde_trilla" && v !== "" && v !== undefined)
            .map(([k, v]) => [k, v])
        ),
        peso_verde: pvOn
          ? { wfinal: pv.wfinal === "" ? null : pv.wfinal, winferiores: pv.winferiores === "" ? null : pv.winferiores, wfinal_inferiores: pv.wfinal_inferiores === "" ? null : pv.wfinal_inferiores }
          : "",
      };
      const res = await fetch(`/api/lotes/${loteId}/trilla`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error("Error al guardar: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Trilla guardada");
      const res2 = await fetch(`/api/lotes/${loteId}/trilla`);
      const r2 = await res2.json();
      setLista((r2.data ?? []) as typeof lista);
      setIndice(0);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando trilla...</p>;

  const NumeroInput = ({ k, l }: { k: keyof Partial<Trilla>; l: string }) => (
    <div className="space-y-1">
      <Label htmlFor={`tri-${k}`}>{l}</Label>
      <Input id={`tri-${k}`} type="number" step="0.01" min={0} disabled={!editable}
        value={(activo[k] as number ?? "") as string | number}
        onChange={(e) => upd(k, e.target.valueAsNumber || "")} />
    </div>
  );

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lista.map((t, i) => (
            <Button key={t.id_trilla ?? i} variant={i === indice ? "secondary" : "outline"} size="sm"
              onClick={() => setIndice(i)}>
              Trilla #{i + 1}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Humedades & Eficiencia de Rendimiento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="tri-repo">Fecha final de reposo</Label>
            <Input id="tri-repo" type="datetime-local" disabled={!editable}
              value={toLocalInput(activo.ffinal_reposo) ?? ""}
              onChange={(e) => upd("ffinal_reposo", e.target.value)} />
          </div>
          {SECC_1.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>⚖️ Balance de Masa Verde (Lote de Exportación)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECC_WVERDE.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pv-toggle" checked={pvOn} disabled={!editable}
              onCheckedChange={(c) => setPvOn(Boolean(c))} />
            <Label htmlFor="pv-toggle" className="font-normal">
              Incluir datos de Peso Verde (Exportación 1:1)
            </Label>
          </div>
          {pvOn && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3">
              {([["wfinal", "Peso Final Exportación (kg)"], ["winferiores", "Peso Inferiores (kg)"], ["wfinal_inferiores", "Peso Final Inferiores (kg)"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`pv-${k}`}>{l}</Label>
                  <Input id={`pv-${k}`} type="number" step="0.01" min={0} disabled={!editable}
                    value={pv[k] as string | number}
                    onChange={(e) => setPv((prev) => ({ ...prev, [k]: e.target.valueAsNumber || "" }))} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>☕ Clasificación y Granulometría</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SECC_CLASIF.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {editable && (
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : lista.length === 0 ? "Registrar trilla" : "Guardar trilla"}
          </Button>
        )}
      </div>
    </div>
  );
}
