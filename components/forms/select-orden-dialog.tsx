"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  clientes: ClienteOrden[];
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

interface SelectOrdenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (ordenId: number) => void;
}

export function SelectOrdenDialog({ open, onOpenChange, onSelect }: SelectOrdenDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const [ordenes, setOrdenes] = useState<OrdenDisponible[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        // 1. Obtener órdenes en estado Pendiente o En Proceso
          const { data: ordenesData, error: ordenesError } = await supabase
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
          .in("estado_orden", ["Pendiente", "En Proceso"]);

        if (ordenesError || !ordenesData) {
          console.error("Error cargando órdenes:", ordenesError);
          setOrdenes([]);
          return;
        }

        const rawOrdenes = ordenesData as unknown as OrdenRaw[];

        // 2. Filtrar solo las que tienen servicio "Tueste"
        const conTueste = rawOrdenes.filter((orden) =>
          orden.servicios_ejecutados.some((s) => s.tipo_servicio === "Tueste")
        );

        if (conTueste.length === 0) {
          setOrdenes([]);
          return;
        }

        // 3. Verificar cuáles NO tienen perfil asociado
        const ordenIds = conTueste.map((o) => o.id_orden);
        const { data: perfilesData } = await supabase
          .from("perfiles_tueste")
          .select("id_orden")
          .in("id_orden", ordenIds);

        const ordenIdsConPerfil = new Set((perfilesData || []).map((p) => p.id_orden));

        const disponibles = conTueste
          .filter((o) => !ordenIdsConPerfil.has(o.id_orden))
          .map((o) => ({
            id_orden: o.id_orden,
            numero_factura: o.numero_factura,
            fecha_orden: o.fecha_orden,
            descripcion_producto: o.descripcion_producto,
            nombre_cliente: o.clientes?.[0]?.nombre_completo || null,
            especificaciones: o.especificaciones_orden?.[0] || null,
          }));

        setOrdenes(disponibles);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, supabase]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Orden para Tueste</DialogTitle>
          <DialogDescription>
            Elige una orden pendiente que incluya el servicio de tueste
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              <p className="text-muted-foreground">Cargando órdenes...</p>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No hay órdenes disponibles</p>
              <p className="text-sm mt-1">
                No se encontraron órdenes pendientes con servicio de tueste sin perfil asociado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordenes.map((orden) => (
                <Card
                  key={orden.id_orden}
                  className="cursor-pointer hover:bg-surface-container-low transition-colors border-outline-variant"
                  onClick={() => onSelect(orden.id_orden)}
                >
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-primary">
                          Factura: {orden.numero_factura}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {orden.nombre_cliente || "Cliente no especificado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {orden.fecha_orden}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground sm:text-right space-y-1">
                        {orden.descripcion_producto && (
                          <p><span className="font-medium text-foreground">Producto:</span> {orden.descripcion_producto}</p>
                        )}
                        {orden.especificaciones?.tipo_tueste && (
                          <p><span className="font-medium text-foreground">Tueste:</span> {orden.especificaciones.tipo_tueste}</p>
                        )}
                        {orden.especificaciones?.tipo_molienda && (
                          <p><span className="font-medium text-foreground">Molienda:</span> {orden.especificaciones.tipo_molienda}</p>
                        )}
                        {orden.especificaciones?.tipo_empaque && (
                          <p><span className="font-medium text-foreground">Empaque:</span> {orden.especificaciones.tipo_empaque}</p>
                        )}
                        {orden.especificaciones?.observaciones && (
                          <p><span className="font-medium text-foreground">Obs:</span> {orden.especificaciones.observaciones}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-outline-variant flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
