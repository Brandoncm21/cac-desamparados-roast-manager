"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { Check, Loader2 } from "lucide-react";

interface ClienteOrden {
  nombre_completo: string;
}

interface ServicioOrden {
  tipo_servicio: string;
}

interface EspecificacionOrden {
  tipo_tueste: string | null;
  tipo_molienda: string | null;
  tipo_empaque: string | null;
  observaciones: string | null;
}

interface OrdenRaw {
  id_orden: number;
  numero_factura: string;
  fecha_orden: string;
  descripcion_producto: string | null;
  clientes: ClienteOrden | null;
  servicios_ejecutados: ServicioOrden[];
  especificaciones_orden: EspecificacionOrden[];
}

interface OrdenDisponible {
  id_orden: number;
  numero_factura: string;
  fecha_orden: string;
  descripcion_producto: string | null;
  nombre_cliente: string | null;
  especificaciones: EspecificacionOrden | null;
}

interface LoteDisponible {
  id_lote: number;
  numero_lote: string;
  enproceso: string;
  estado_lote: string | null;
  productores: { nombre_completo: string } | null;
  fincas: { nombre: string } | null;
}

interface CrearPerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ordenId: number | null, loteIds: number[]) => void;
}

export function CrearPerfilDialog({ open, onOpenChange, onConfirm }: CrearPerfilDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const [ordenes, setOrdenes] = useState<OrdenDisponible[]>([]);
  const [lotes, setLotes] = useState<LoteDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);
  const [selectedLoteIds, setSelectedLoteIds] = useState<number[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ordenesRes, lotesRes] = await Promise.all([
          supabase
            .from("ordenes_trabajo")
            .select(
              `
              id_orden,
              numero_factura,
              fecha_orden,
              descripcion_producto,
              clientes(nombre_completo),
              servicios_ejecutados(tipo_servicio),
              especificaciones_orden(tipo_tueste, tipo_molienda, tipo_empaque, observaciones)
            `
            )
            .in("estado_orden", ["Pendiente", "En Proceso"]),
          supabase
            .from("lotes_cafe")
            .select(
              "id_lote, numero_lote, enproceso, estado_lote, productores(nombre_completo), fincas(nombre)"
            )
            .is("deleted_at", null)
            .order("numero_lote"),
        ]);

        const rawOrdenes = (ordenesRes.data ?? []) as unknown as OrdenRaw[];
        const conTueste = rawOrdenes.filter((orden) =>
          orden.servicios_ejecutados.some((s) => s.tipo_servicio === "Tueste")
        );

        let disponibles: OrdenDisponible[] = [];
        if (conTueste.length > 0) {
          const ordenIds = conTueste.map((o) => o.id_orden);
          const { data: perfilesData } = await supabase
            .from("perfiles_tueste")
            .select("id_orden")
            .in("id_orden", ordenIds)
            .is("deleted_at", null);

          const ordenIdsConPerfil = new Set(
            (perfilesData ?? []).map((p) => p.id_orden)
          );

          disponibles = conTueste
            .filter((o) => !ordenIdsConPerfil.has(o.id_orden))
            .map((o) => ({
              id_orden: o.id_orden,
              numero_factura: o.numero_factura,
              fecha_orden: o.fecha_orden,
              descripcion_producto: o.descripcion_producto,
              nombre_cliente: o.clientes?.nombre_completo || null,
              especificaciones: o.especificaciones_orden?.[0] || null,
            }));
        }

        setOrdenes(disponibles);
        setLotes((lotesRes.data ?? []) as unknown as LoteDisponible[]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase]);

  const toggleLote = (idLote: number) => {
    setSelectedLoteIds((prev) =>
      prev.includes(idLote) ? prev.filter((id) => id !== idLote) : [...prev, idLote]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Perfil</DialogTitle>
          <DialogDescription>
            La factura y los lotes son independientes. Puede crear el perfil solo con lotes,
            solo con factura o con ambos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-muted-foreground">Cargando facturas y lotes...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Factura (opcional)</h3>
                  <p className="text-xs text-muted-foreground">
                    Solo facturas con servicio de Tueste y sin perfil activo. Puede omitirla si
                    el perfil se basa únicamente en lotes.
                  </p>
                </div>
                {selectedOrdenId && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrdenId(null)}>
                    Sin factura
                  </Button>
                )}
              </div>
              {ordenes.length === 0 ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-muted-foreground">
                  No hay facturas disponibles con servicio de Tueste sin perfil.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ordenes.map((orden) => {
                    const activa = selectedOrdenId === orden.id_orden;
                    return (
                      <Card
                        key={orden.id_orden}
                        className={`cursor-pointer transition-colors ${
                          activa
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-outline-variant hover:bg-surface-container-low"
                        }`}
                        onClick={() => setSelectedOrdenId(activa ? null : orden.id_orden)}
                      >
                        <CardContent className="space-y-1 py-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-primary">
                              Factura: {orden.numero_factura}
                            </p>
                            {activa && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {orden.nombre_cliente || "Cliente no especificado"}
                          </p>
                          <p className="text-xs text-muted-foreground">{orden.fecha_orden}</p>
                          {orden.descripcion_producto && (
                            <p className="text-xs text-muted-foreground">
                              Producto: {orden.descripcion_producto}
                            </p>
                          )}
                          {orden.especificaciones?.tipo_tueste && (
                            <p className="text-xs text-muted-foreground">
                              Tueste: {orden.especificaciones.tipo_tueste}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Lotes</h3>
                <p className="text-xs text-muted-foreground">
                  Opcional: puede asociar uno, varios o ningún lote. Se muestra el proceso
                  actual de cada lote.
                </p>
              </div>
              {lotes.length === 0 ? (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-muted-foreground">
                  No hay lotes activos para seleccionar.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                  {lotes.map((lote) => {
                    const seleccionado = selectedLoteIds.includes(lote.id_lote);
                    return (
                      <label
                        key={lote.id_lote}
                        className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${
                          seleccionado ? "bg-primary/5" : "hover:bg-surface-container-low"
                        }`}
                      >
                        <Checkbox
                          checked={seleccionado}
                          onCheckedChange={() => toggleLote(lote.id_lote)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold">
                              {lote.numero_lote}
                            </span>
                            <EstadoBadge estado={lote.enproceso} familia="lote" />
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {lote.productores?.nombre_completo || "Productor no especificado"}
                            {lote.fincas?.nombre ? ` · ${lote.fincas.nombre}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedOrdenId
              ? `Factura seleccionada · ${selectedLoteIds.length} lote(s)`
              : selectedLoteIds.length > 0
                ? `Sin factura · ${selectedLoteIds.length} lote(s)`
                : "Seleccione al menos una factura o un lote"}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={loading || (!selectedOrdenId && selectedLoteIds.length === 0)}
              onClick={() => onConfirm(selectedOrdenId, selectedLoteIds)}
            >
              Crear perfil
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
