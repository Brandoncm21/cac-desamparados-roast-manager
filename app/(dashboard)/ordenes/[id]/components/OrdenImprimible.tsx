"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/estado-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearColones, formatearPeso } from "@/lib/format";
import styles from "../page.module.css";
import type { OrdenDetalle } from "../hooks/useOrdenDetalle";

interface OrdenImprimibleProps {
  orden: OrdenDetalle;
  total: number;
}

/** Documento de la orden tal como se imprime. */
export function OrdenImprimible({ orden, total }: OrdenImprimibleProps) {
  const cliente = orden.clientes;
  const servicios = orden.servicios_ejecutados;

  return (
    <div className={`printArea ${styles["printArea"]}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">SCACR</h2>
        <p className="text-muted-foreground">Centro Agrícola Cantonal de Desamparados</p>
        <p className="font-mono text-xl mt-2">Orden #{orden.numero_factura}</p>
        <EstadoBadge estado={orden.estado_orden} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{cliente?.nombre_completo || "—"}</p>
            <p>{cliente?.telefono || "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Proceso: <span className="font-medium">{orden.proceso_cafe || "—"}</span>
            </p>
            <p>
              Humedad:{" "}
              <span className="font-medium">{orden.porcentaje_humedad_entrada ?? "—"}%</span>
            </p>
            <p>
              Factura: <span className="font-medium">{orden.numero_factura}</span>
            </p>
            <p>
              Fecha: <span className="font-medium">{orden.fecha_orden}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Datos de Cierre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Hora: <span className="font-medium">{orden.hora_cierre || "—"}</span>
          </p>
          <p>
            Responsable:{" "}
            <span className="font-medium">{orden.empleado_recibe?.nombre || "Sin asignar"}</span>
          </p>
          <p>
            Finca:{" "}
            <span className="font-medium">
              {orden.fincas?.nombre
                ? `${orden.fincas.nombre}${orden.fincas.altura != null ? ` (${orden.fincas.altura} msnm)` : ""}`
                : "Sin especificar"}
            </span>
          </p>
          <p>
            Producto:{" "}
            <span className="font-medium">{orden.descripcion_producto || "Sin especificar"}</span>
          </p>
          <p>
            Lotes:{" "}
            <span className="font-medium">
              {orden.lotes?.length
                ? orden.lotes
                    .map((lote) => `${lote.numero_lote} (${lote.enproceso})`)
                    .join(", ")
                : "Sin especificar"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Precio/kg</TableHead>
                <TableHead>Precio Empaque</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicios.map((servicio) => (
                <TableRow key={servicio.id_servicio}>
                  <TableCell className="font-medium">
                    {servicio.tipo_servicio}
                    {servicio.empaques?.nombre && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {servicio.empaques.nombre}
                      </span>
                    )}
                    {servicio.override_precio && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Modificado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatearPeso(servicio.peso_kg ?? servicio.peso_inicial)}
                  </TableCell>
                  <TableCell>{formatearColones(servicio.snapshot_precio_por_kg)}</TableCell>
                  <TableCell>{formatearColones(servicio.snapshot_precio_empaque)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatearColones(servicio.linea_total || servicio.precio || 0)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold">{formatearColones(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {servicios.some((s) => s.override_precio && s.override_motivo) && (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {servicios
                .filter((s) => s.override_precio && s.override_motivo)
                .map((servicio) => (
                  <p key={servicio.id_servicio}>
                    <span className="font-medium">{servicio.tipo_servicio}:</span> Motivo de
                    modificación — {servicio.override_motivo}
                  </p>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {orden.especificaciones_orden && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Especificaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Tueste: {orden.especificaciones_orden.tipo_tueste || "—"}</p>
            <p>Molienda: {orden.especificaciones_orden.tipo_molienda || "—"}</p>
            <p>Empaque: {orden.especificaciones_orden.tipo_empaque || "—"}</p>
            <p>Observaciones: {orden.especificaciones_orden.observaciones || "—"}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>Documento generado por SCACR - Sistema de Gestión de Torrefacción</p>
      </div>
    </div>
  );
}
