"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUserRole, canEditLote, canDeleteLote } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CaracterizacionPanel } from "@/components/lotes/caracterizacion-panel";
import { SecadoPanel } from "@/components/lotes/secado-panel";
import { BodegaPanel } from "@/components/lotes/bodega-panel";
import { TrillaPanel } from "@/components/lotes/trilla-panel";
import { TrazabilidadPanel } from "@/components/lotes/trazabilidad-panel";

interface LoteDetalle {
  id_lote: number;
  nlote: string;
  nrecibo: number;
  id_cliente: number;
  id_finca: number;
  clientes: { nombre_completo: string } | null;
  fincas: { nombre: string; altura: number; zonas_finca: { nombre: string } | null } | null;
  robjetivo: number | null;
  rtotal: number | null;
  disponible: number | null;
  vendido: boolean;
  enproceso: string;
  semilavado: boolean;
  "natural": boolean;
  anaerobico: boolean;
  miel: boolean;
  lavado: boolean;
  otro: string | null;
  pf_pulpa_pergamino: number | null;
  pf_dmecanicos: number | null;
  pf_segundas: number | null;
  pf_pergamino_pulpa: number | null;
  pdensidad_fruta: number | null;
  pdensidad_pergamino_humedo: number | null;
  fecha_acopio: string;
  ordenes_vinculadas: Array<{
    id_orden: number;
    peso_kg: number | null;
    created_at: string;
    ordenes_trabajo: {
      numero_factura: string | null;
      estado_orden: string | null;
      fecha_orden: string | null;
    } | null;
  }>;
}

const DESPULPADO: string[] = [];
void DESPULPADO;

const TABS = ["Caracterización", "Secado", "Bodega", "Trilla", "Trazabilidad Integral"] as const;

export default function LoteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const loteId = params["id"] as string;

  const [lote, setLote] = useState<LoteDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [userRole, setUserRole] = useState<"Admin" | "Tostador" | "Recepción" | "Operador" | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Caracterización");

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  useEffect(() => {
    const load = async () => {
      setCargando(true);
      const res = await fetch(`/api/lotes/${loteId}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error("Error al cargar lote: " + (result.error?.message || "Error desconocido"));
        setLote(null);
      } else {
        setLote(result.data);
      }
      setCargando(false);
    };
    load();
  }, [loteId]);

  const eliminarLote = async () => {
    if (!window.confirm("¿Está seguro de que desea desactivar este lote?")) return;

    const res = await fetch(`/api/lotes/${loteId}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      toast.error("Error al desactivar: " + (result.error?.message || "Error desconocido"));
      return;
    }
    toast.success("Lote desactivado exitosamente");
    router.push("/lotes");
  };

  if (cargando) {
    return <p className="mt-6 text-muted-foreground">Cargando lote...</p>;
  }

  if (!lote) {
    return <p className="mt-6 text-muted-foreground">Lote no encontrado.</p>;
  }

  const despulpados = (
    [
      ["lavado", lote.lavado],
      ["miel", lote.miel],
      ["semilavado", lote.semilavado],
      ["anaerobico", lote.anaerobico],
      ["natural", lote["natural"]],
      ["otro", Boolean(lote.otro), lote.otro],
    ] as Array<[string, boolean, string?]>
  ).filter(([, activo]) => Boolean(activo));

  const finfo = (v: number | null) =>
    v == null ? "-" : String(v);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/lotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold font-mono">{lote.nlote}</h1>
        <Badge>{lote.enproceso}</Badge>
        {lote.vendido && <Badge variant="secondary">Vendido</Badge>}
        <div className="ml-auto flex gap-2">
          {canEditLote(userRole) && (
            <Link href={`/lotes/${lote.id_lote}/editar`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </Link>
          )}
          {canDeleteLote(userRole) && (
            <Button variant="destructive" size="sm" onClick={eliminarLote}>
              <Trash2 className="h-4 w-4 mr-1" />
              Desactivar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Principal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground block">Recibo</span>#{lote.nrecibo}</div>
          <div><span className="text-muted-foreground block">Productor</span>{lote.clientes?.nombre_completo ?? "-"}</div>
          <div><span className="text-muted-foreground block">Finca</span>{lote.fincas?.nombre ?? "-"}</div>
          <div><span className="text-muted-foreground block">Zona</span>{lote.fincas?.zonas_finca?.nombre || "-"}</div>
          <div><span className="text-muted-foreground block">Altura (msnm)</span>{finfo(lote.fincas?.altura ?? null)}</div>
          <div>
            <span className="text-muted-foreground block">Fecha de acopio</span>
            {new Date(lote.fecha_acopio).toLocaleString("es-CR")}
          </div>
          <div><span className="text-muted-foreground block">Rango objetivo (%)</span>{finfo(lote.robjetivo)}</div>
          <div><span className="text-muted-foreground block">Rango total (%)</span>{finfo(lote.rtotal)}</div>
          <div><span className="text-muted-foreground block">Disponible</span>{lote.disponible != null ? `${lote.disponible} kg` : "-"}</div>
          <div className="col-span-2 sm:col-span-3">
            <span className="text-muted-foreground block">Tipo de despulpado</span>
            {despulpados.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {despulpados.map(([tag]) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            ) : "-"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pruebas Físicas en Húmedo &amp; Análisis de Densidad</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground block">Pulpa/Pergamino (%)</span>{finfo(lote.pf_pulpa_pergamino)}</div>
          <div><span className="text-muted-foreground block">Daños mecánicos (%)</span>{finfo(lote.pf_dmecanicos)}</div>
          <div><span className="text-muted-foreground block">Segundas (%)</span>{finfo(lote.pf_segundas)}</div>
          <div><span className="text-muted-foreground block">Pergamino/Pulpa (%)</span>{finfo(lote.pf_pergamino_pulpa)}</div>
          <div><span className="text-muted-foreground block">Densidad de fruta</span>{finfo(lote.pdensidad_fruta)}</div>
          <div><span className="text-muted-foreground block">Densidad pergamino húmedo</span>{finfo(lote.pdensidad_pergamino_humedo)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes enlazadas</CardTitle>
        </CardHeader>
        <CardContent>
          {lote.ordenes_vinculadas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Este lote todavía no está enlazado a ninguna orden de trabajo.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Enlazada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lote.ordenes_vinculadas.map((v) => (
                    <TableRow key={v.id_orden}>
                      <TableCell>
                        <Link href={`/ordenes/${v.id_orden}`} className="underline">
                          #{v.id_orden}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.ordenes_trabajo?.numero_factura ?? "-"}</TableCell>
                      <TableCell>{v.ordenes_trabajo?.estado_orden ?? "-"}</TableCell>
                      <TableCell>{v.peso_kg ?? "-"}</TableCell>
                      <TableCell>{new Date(v.created_at).toLocaleDateString("es-CR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-2">
        {TABS.map((t) => (
          <Button key={t} variant={tab === t ? "secondary" : "ghost"} size="sm"
            onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>

      {tab === "Caracterización" && <CaracterizacionPanel loteId={loteId} editable />}
      {tab === "Secado" && <SecadoPanel loteId={loteId} editable />}
      {tab === "Bodega" && <BodegaPanel loteId={loteId} editable />}
      {tab === "Trilla" && <TrillaPanel loteId={loteId} editable />}
      {tab === "Trazabilidad Integral" && <TrazabilidadPanel loteId={loteId} />}
    </div>
  );
}
