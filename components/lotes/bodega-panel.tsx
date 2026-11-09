"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { toLocalInput, localNow } from "./caracterizacion-panel";

interface Bodega {
  id_bodega?: number;
  finicio_reposo: string | null;
  cantidad_sacos: number | null;
  w_bellota: number | null;
  w_pergamino: number | null;
  hinicial: number | null;
  hfinal: number | null;
  d_bellota: number | null;
  d_pergamino: number | null;
  pmh_relativa: number | null;
  pmt_interna: number | null;
  pmt_externa: number | null;
  secado_bodega: Array<{ id_secado: number; cantidad_sacos: number; created_at: string }>;
}

const SECCION_PESOS: Array<[keyof Partial<Bodega>, string]> = [
  ["w_bellota", "Peso Bellota (kg)"],
  ["w_pergamino", "Peso Pergamino (kg)"],
  ["cantidad_sacos", "Cantidad de Sacos"],
];

const SECCION_HUMEDADES: Array<[keyof Partial<Bodega>, string]> = [
  ["hinicial", "Humedad inicial (%)"],
  ["hfinal", "Humedad final (%)"],
  ["pmh_relativa", "Humedad relativa (%)"],
];

const SECCION_DENSIDADES: Array<[keyof Partial<Bodega>, string]> = [
  ["d_bellota", "Densidad Bellota (g/ml)"],
  ["d_pergamino", "Densidad Pergamino (g/ml)"],
];

const SECCION_MASA: Array<[keyof Partial<Bodega>, string]> = [
  ["pmt_interna", "Temperatura Interna (°C)"],
  ["pmt_externa", "Temperatura Externa (°C)"],
];

export function BodegaPanel({ loteId, editable }: { loteId: string; editable: boolean }) {
  const [lista, setLista] = useState<Bodega[]>([]);
  const [indice, setIndice] = useState(0);
  const [secadosDisponibles, setSecadosDisponibles] = useState<Array<{ id_secado: number; finicio: string }>>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const [resB, resS] = await Promise.all([
        fetch(`/api/lotes/${loteId}/bodega`),
        fetch(`/api/lotes/${loteId}/secado`),
      ]);
      const resBJSON = await resB.json();
      const resSJSON = await resS.json();
      setLista(resB.ok ? resBJSON.data : []);
      setSecadosDisponibles(resS.ok ? (resSJSON.data ?? []).map((s: { id_secado: number; finicio: string }) => s) : []);
      setCargando(false);
    })();
  }, [loteId]);

  const activo: Bodega = lista[indice] ?? {
    finicio_reposo: localNow(),
    cantidad_sacos: null, w_bellota: null, w_pergamino: null,
    hinicial: null, hfinal: null, d_bellota: null, d_pergamino: null,
    pmh_relativa: null, pmt_interna: null, pmt_externa: null,
    secado_bodega: [],
  };

  const upd = (k: keyof Partial<Bodega>, v: string | number) =>
    setLista((prev) => {
      const next = [...prev];
      next[indice] = { ...activo, [k]: v === "" ? null : v } as Bodega;
      return next;
    });

  const updVinculo = (secadoId: number, sacos: number) => {
    const map = new Map(activo.secado_bodega.map((s) => [s.id_secado, s]));
    map.set(secadoId, { id_secado: secadoId, cantidad_sacos: sacos, created_at: "" });
    upd("secado_bodega" as keyof Partial<Bodega>, Array.from(map.values()) as unknown as number);
  };

  const quitarVinculo = (secadoId: number) =>
    upd("secado_bodega" as keyof Partial<Bodega>,
      activo.secado_bodega.filter((s) => s.id_secado !== secadoId) as unknown as number);

  const guardar = async () => {
    setGuardando(true);
    try {
      const payload = {
        bodega: Object.fromEntries(
          Object.entries(activo)
            .filter(([k]) => k !== "secado_bodega")
            .map(([k, v]) => [k, v === "" ? null : v])
        ),
        secados_guardados: activo.secado_bodega.map((s) => ({
          id_secado: s.id_secado,
          cantidad_sacos: s.cantidad_sacos,
        })),
      };
      const res = await fetch(`/api/lotes/${loteId}/bodega`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error("Error al guardar: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Bodega guardada");
      const res2 = await fetch(`/api/lotes/${loteId}/bodega`);
      const r2 = await res2.json();
      setLista((r2.data ?? []) as Bodega[]);
      const Keeps = (r2.data ?? []).findIndex((b: { id_bodega: number }) => (b.id_bodega != null));
      setIndice(Keeps >= 0 ? Keeps : 0);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando bodega...</p>;

  const NumeroInput = ({ k, l, step = "0.01" }: { k: keyof Partial<Bodega>; l: string; step?: string }) => (
    <div className="space-y-1">
      <Label htmlFor={`bod-${k}`}>{l}</Label>
      <Input id={`bod-${k}`} type="number" step={step} min={0} disabled={!editable}
        value={(activo[k] as number ?? "") as string | number}
        onChange={(e) => upd(k, e.target.valueAsNumber || "")} />
    </div>
  );

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lista.map((b, i) => (
            <Button key={b.id_bodega ?? i} variant={i === indice ? "secondary" : "outline"} size="sm"
              onClick={() => setIndice(i)}>
              Bodega #{i + 1}{b.cantidad_sacos != null ? ` · ${b.cantidad_sacos} sacos` : ""}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Sacado a Reposo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bod-reposo">Inicio de reposo</Label>
            <Input id="bod-reposo" type="datetime-local" disabled={!editable}
              value={toLocalInput(activo.finicio_reposo) ?? ""}
              onChange={(e) => upd("finicio_reposo", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>⚖️ Pesos del Café</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SECCION_PESOS.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>💧 Humedades</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SECCION_HUMEDADES.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>📊 Densidades</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECCION_DENSIDADES.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>🔬 Pruebas de Masa</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECCION_MASA.map(([k, l]) => <NumeroInput key={k} k={k} l={l} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vínculos: Secados guarding en esta bodega</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {activo.secado_bodega.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin secados vinculados.</p>
          )}
          {activo.secado_bodega.map((v) => {
            const sec = secadosDisponibles.find((s) => s.id_secado === v.id_secado);
            return (
              <div key={v.id_secado} className="flex items-end gap-3">
                <div className="space-y-1 flex-1">
                  <Label>Secado #{v.id_secado}{sec ? ` (${toLocalInput(sec.finicio) ?? ""})` : ""}</Label>
                  <Input type="number" min={1} disabled={!editable}
                    value={v.cantidad_sacos}
                    onChange={(e) => updVinculo(v.id_secado, e.target.valueAsNumber || 1)} />
                </div>
                {editable && (
                  <Button variant="ghost" size="icon" onClick={() => quitarVinculo(v.id_secado)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
          {editable && (
            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label>Asignar secado del lote</Label>
                <Select
                  onValueChange={(v) => updVinculo(Number(v), 1)}
                  disabled={secadosDisponibles.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un secado" />
                  </SelectTrigger>
                  <SelectContent>
                    {secadosDisponibles
                      .filter((s) => !activo.secado_bodega.some((v) => v.id_secado === s.id_secado))
                      .map((s) => (
                        <SelectItem key={s.id_secado} value={String(s.id_secado)}>
                          Secado #{s.id_secado}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Plus className="h-6 w-6 text-muted-foreground mb-3" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {editable && (
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar bodega"}
          </Button>
        )}
      </div>
    </div>
  );
}
