"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sprout, Beaker, Thermometer, Warehouse, Coffee as CoffeeIcon,
  FileText, Flame, CupSoda, CircleDot, CheckCircle2, CircleDashed,
} from "lucide-react";

interface Resumen {
  caracterizaciones: number;
  secados: number;
  bodegas: number;
  trillas: number;
  trillaWfinal: number | null;
  ordenes: Array<{ id_orden: number; origen: string; estado_orden?: string }>;
  perfiles: Array<{ id_perfil: number; estado: string; numero_lote: string | null }>;
  cataciones: Array<{ id_catacion_tueste: number; pfinales: number | null }>;
  lote: { nlote: string; enproceso: string; vendido: boolean };
}

const ETAPAS = [
  { key: "acopio", label: "Acopio", icon: Sprout },
  { key: "caracterizacion", label: "Caracterización", icon: Beaker },
  { key: "secado", label: "Secado", icon: Thermometer },
  { key: "bodega", label: "Bodega", icon: Warehouse },
  { key: "trilla", label: "Trilla", icon: CoffeeIcon },
  { key: "orden", label: "Orden (e1)", icon: FileText },
  { key: "tueste", label: "Tueste", icon: Flame },
  { key: "catacion", label: "Catación (e2)", icon: CupSoda },
  { key: "vendido", label: "Vendido", icon: CircleDot },
] as const;

function EtapaChip({ done, activo }: { done: boolean; activo?: boolean }) {
  if (done) return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (activo) return <CircleDot className="h-5 w-5 text-amber-600 animate-pulse" />;
  return <CircleDashed className="h-5 w-5 text-muted-foreground/40" />;
}

export function TrazabilidadPanel({ loteId }: { loteId: string }) {
  const [res, setRes] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    (async () => {
      try {
        const [car, sec, bod, tri, cat] = await Promise.all([
          fetch(`/api/lotes/${loteId}/caracterizacion`).then((r) => r.json()),
          fetch(`/api/lotes/${loteId}/secado`).then((r) => r.json()),
          fetch(`/api/lotes/${loteId}/bodega`).then((r) => r.json()),
          fetch(`/api/lotes/${loteId}/trilla`).then((r) => r.json()),
        ].map((p) => p.catch(() => ({ data: [] }))).concat(
          [fetch("/api/cataciones?pageSize=50").then((r) => r.json()).catch(() => ({ data: [] }))]
        ));

        const lotesRes = await fetch(`/api/lotes/${loteId}`).then((r) => r.json());
        const lote = lotesRes.data;

        const trillas = Array.isArray(tri?.data) ? tri.data : [];
        const trillaActiva: { id_trilla?: number; wverde_final?: number | null } | undefined = trillas[0];

        // Resumen de tueste: perfiles ligados a las órdenes de este lote (via supabase client)
        let perfiles: Array<{ id_perfil: number; estado: string; numero_lote: string | null }> = [];
        let cataciones: Array<{ id_catacion_tueste: number; pfinales: number | null }> = [];

        const ole: Array<{ id_orden: number; origen: string }> = Array.isArray(lote?.ordenes_vinculadas)
          ? lote.ordenes_vinculadas
          : [];

        const nlote: string | undefined = lote?.nlote;
        if (nlote) {
          const catList = cat?.data?.data ?? cat?.data ?? [];
          cataciones = Array.isArray(catList)
            ? catList.filter((c: { nlote: string | null }) => c.nlote === nlote)
                .map((c: { id_catacion_tueste: number; pfinales: number | null }) => ({
                  id_catacion_tueste: c.id_catacion_tueste,
                  pfinales: c.pfinales,
                }))
            : [];
        }

        // Tueste: perfiles ligados a las órdenes enlazadas de este lote
        if (ole.length > 0) {
          const ids = ole.map((o) => o.id_orden);
          const { data: pf } = await supabase
            .from("perfiles_tueste")
            .select("id_perfil, estado, numero_lote")
            .in("id_orden", ids)
            .is("deleted_at", null)
            .order("id_perfil", { ascending: false });
          perfiles = (pf ?? []) as typeof perfiles;
        }

        setRes({
          caracterizaciones: Array.isArray(car?.data) ? (car.data as unknown[]).length : 0,
          secados: Array.isArray(sec?.data) ? (sec.data as unknown[]).length : 0,
          bodegas: Array.isArray(bod?.data) ? (bod.data as unknown[]).length : 0,
          trillas: trillas.length,
          trillaWfinal: trillaActiva?.wverde_final ?? null,
          ordenes: ole,
          perfiles,
          cataciones,
          lote: {
            nlote: lote?.nlote ?? "",
            enproceso: lote?.enproceso ?? "",
            vendido: Boolean(lote?.vendido),
          },
        });
      } catch {
        toast.error("No se pudo armar la trazabilidad del lote");
      } finally {
        setCargando(false);
      }
    })();
  }, [loteId, supabase]);

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando trazabilidad…</p>;
  if (!res) return null;

  const ordenFusion = res.ordenes.find((o) => o.origen === "fusion");

  const estadoEtapas: Record<string, boolean | undefined> = {
    acopio: true,
    caracterizacion: res.caracterizaciones > 0,
    secado: res.secados > 0,
    bodega: res.bodegas > 0,
    trilla: res.trillas > 0,
    orden: Boolean(ordenFusion),
    tueste: res.perfiles.some((p) => p.estado === "Completado"),
    catacion: res.cataciones.length > 0,
    vendido: res.lote.vendido,
  };

  const estado = (k: string | undefined): boolean => Boolean(k && estadoEtapas[k]);

  const etapaActiva =
    ETAPAS.find((e, i) => !estadoEtapas[e.key] && estado(ETAPAS[i - 1]?.key))?.key ??
    (res.lote.vendido ? "vendido" : "orden");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Pipeline Lote → Taza</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-start gap-3">
            {ETAPAS.map((e, i) => (
              <li key={e.key} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1 min-w-[92px]">
                  <e.icon className="h-4 w-4 text-muted-foreground" />
                  <EtapaChip done={Boolean(estadoEtapas[e.key])} activo={e.key === etapaActiva} />
                  <span className="text-xs text-center">{e.label}</span>
                </div>
                {i < ETAPAS.length - 1 && <div className="h-px w-6 bg-border" />}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Etapas físicas del lote</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground block">Caracterizaciones</span>{res.caracterizaciones} registradas</div>
            <div><span className="text-muted-foreground block">Secados</span>{res.secados} procesos en pestaña</div>
            <div><span className="text-muted-foreground block">Bodegas</span>{res.bodegas} ingresos</div>
            <div>
              <span className="text-muted-foreground block">Trilla — wverde_final</span>
              {res.trillaWfinal != null ? `${res.trillaWfinal} kg` : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Conectores del pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground block">e1 — Orden fusionada</span>
              {ordenFusion ? (
                <Link href={`/ordenes/${ordenFusion.id_orden}`}>
                  <Button variant="link" className="h-auto p-0">Orden #{ordenFusion.id_orden} →</Button>
                </Link>
              ) : (
                <span>Disponible al completar la trilla (botón en la pestaña Trilla).</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block">Tuestes ligados a la orden</span>
              {res.perfiles.length === 0 ? (
                <span>Aún sin perfil en estado Completado.</span>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {res.perfiles.map((p) => (
                    <Badge key={p.id_perfil} variant="secondary">
                      {p.numero_lote || `Perfil #${p.id_perfil}`} · {p.estado}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block">e2 — Cataciones de este lote</span>
              {res.cataciones.length === 0 ? (
                <span>Pendiente: registre la catación del tueste (K3).</span>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {res.cataciones.map((c) => (
                    <Link key={c.id_catacion_tueste} href={`/cataciones/${c.id_catacion_tueste}`}>
                      <Button variant="link" className="h-auto p-0">
                        Catación #{c.id_catacion_tueste}
                        {c.pfinales != null ? ` — ${c.pfinales}` : ""}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
