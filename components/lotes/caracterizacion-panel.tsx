"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Caracterizacion {
  id_caracterizacion?: number;
  tiempo: string;
  proceso: string | null;
  l_asignado: string | null;
  c_verdes: number | null;
  c_objetivo: number | null;
  c_inmaduras: number | null;
  c_sobremaduras: number | null;
  c_secas: number | null;
  vanos: number | null;
  secos: number | null;
  dr_maduras: number | null;
  densidad: number | null;
  m_tabla: number | null;
  e_maduracion: number | null;
  broca: number | null;
  pc_debajo: number | null;
  pc_verdes: number | null;
  pc_secas: number | null;
  pc_encima: number | null;
  pc_objetivo: number | null;
}

interface RcItem {
  tipo_rc: "maduras" | "inmaduras" | "sobremaduras";
  gbx: number | null;
  promedio: number | null;
  observaciones: string | null;
}

const CONTEOS: Array<[keyof Partial<Caracterizacion>, string]> = [
  ["c_verdes", "Verdes"],
  ["c_objetivo", "Objetivo"],
  ["c_inmaduras", "Inmaduras"],
  ["c_sobremaduras", "Sobremaduras"],
  ["c_secas", "Secas"],
  ["vanos", "Vanos"],
  ["secos", "Secos"],
];

const PORCENTAJES: Array<[keyof Partial<Caracterizacion>, string]> = [
  ["broca", "Broca (%)"],
  ["pc_debajo", "Debajo de madurez (%)"],
  ["pc_verdes", "Verdes (%)"],
  ["pc_secas", "Secas (%)"],
  ["pc_encima", "Encima de madurez (%)"],
  ["pc_objetivo", "Objetivo (%)"],
];

const VALORES: Array<[keyof Partial<Caracterizacion>, string]> = [
  ["dr_maduras", "Rango óptimo maduras (°Brix)"],
  ["densidad", "Densidad"],
  ["m_tabla", "Muestreo tabla"],
  ["e_maduracion", "Escala de maduración"],
];

export function CaracterizacionPanel({ loteId, editable }: { loteId: string; editable: boolean }) {
  const [car, setCar] = useState<Caracterizacion | null>(null);
  const [rcs, setRcs] = useState<RcItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/lotes/${loteId}/caracterizacion`);
      const result = await res.json();
      if (res.ok) {
        setCar(result.data.caracterizacion);
        setRcs(result.data.rcs ?? []);
      }
      setCargando(false);
    };
    load();
  }, [loteId]);

  const campo = (k: keyof Partial<Caracterizacion>, v: string | number) =>
    setCar((prev) => ({ ...(prev ?? { tiempo: localNow() }), [k]: v === "" ? null : v }) as Caracterizacion);

  const guardar = async () => {
    setGuardando(true);
    try {
      const payload = {
        caracterizacion: car ?? { tiempo: localNow() },
        rcs: rcs.filter((r) => r.tipo_rc),
      };
      const res = await fetch(`/api/lotes/${loteId}/caracterizacion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error("Error al guardar: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Caracterización guardada");
      setCar(result.data.caracterizacion ?? car);
      setRcs(result.data.rcs ?? rcs);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando caracterización...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Muestreo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="car-tiempo">Fecha/Hora del muestreo *</Label>
            <Input
              id="car-tiempo" type="datetime-local" disabled={!editable}
              value={toLocalInput(car?.tiempo) ?? ""}
              onChange={(e) => campo("tiempo", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="car-proceso">Proceso</Label>
            <Input id="car-proceso" maxLength={100} disabled={!editable}
              value={car?.proceso ?? ""}
              onChange={(e) => campo("proceso", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="car-asignado">Lote asignado</Label>
            <Input id="car-asignado" maxLength={50} disabled={!editable}
              value={car?.l_asignado ?? ""}
              onChange={(e) => campo("l_asignado", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conteos de Muestreo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTEOS.map(([k, l]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`car-${k}`}>{l}</Label>
              <Input id={`car-${k}`} type="number" min={0} disabled={!editable}
                value={(car?.[k] as number ?? "") as string | number}
                onChange={(e) => campo(k, e.target.valueAsNumber || "")} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rendimientos y Densidad</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...VALORES, ...PORCENTAJES].map(([k, l]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`car-${k}`}>{l}</Label>
              <Input id={`car-${k}`} type="number" step="0.01" min={0} disabled={!editable}
                value={(car?.[k] as number ?? "") as string | number}
                onChange={(e) => campo(k, e.target.valueAsNumber || "")} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros de Cálculo (RC)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(["sobremaduras", "inmaduras", "maduras"] as const).map((tipo) => {
            const rc = rcs.find((r) => r.tipo_rc === tipo) ?? { tipo_rc: tipo, gbx: null, promedio: null, observaciones: null };
            const idx = rcs.findIndex((r) => r.tipo_rc === tipo);
            const upd = (k: keyof RcItem, v: string | number) => {
              const next = [...rcs];
              const base = { ...rc, [k]: v === "" ? null : v };
              if (idx >= 0) next[idx] = { ...(next[idx] as RcItem), ...base } as RcItem;
              else next.push(base as RcItem);
              setRcs(next);
            };
            return (
              <div key={tipo} className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">RC {tipo}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>{`GBX (${tipo})`}</Label>
                    <Input type="number" step="0.01" min={0} disabled={!editable}
                      value={(rc.gbx ?? "") as string | number}
                      onChange={(e) => upd("gbx", e.target.valueAsNumber || "")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Promedio</Label>
                    <Input type="number" step="0.01" min={0} disabled={!editable}
                      value={(rc.promedio ?? "") as string | number}
                      onChange={(e) => upd("promedio", e.target.valueAsNumber || "")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Observaciones</Label>
                    <Textarea rows={2} maxLength={500} disabled={!editable}
                      value={rc.observaciones ?? ""}
                      onChange={(e) => upd("observaciones", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editable && (
        <div className="flex justify-end">
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar caracterización"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function toLocalInput(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
