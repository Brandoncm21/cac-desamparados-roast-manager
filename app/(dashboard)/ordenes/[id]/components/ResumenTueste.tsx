"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcularRendimiento, type MetricaTueste } from "@/lib/services/orden-detalle";
import type { PerfilConResumen } from "../hooks/useOrdenDetalle";

interface ResumenTuesteProps {
  perfil: PerfilConResumen;
  metricas: MetricaTueste[];
}

/** Resumen del tueste: estado, DTR y rendimiento por métrica. */
export function ResumenTueste({ perfil, metricas }: ResumenTuesteProps) {
  return (
    <Card className="mb-8 noPrint">
      <CardHeader>
        <CardTitle className="text-lg">Resumen de Tueste</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <p className="font-medium">{perfil.estado || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tiempo Desarrollo</p>
            <p className="font-medium">{perfil.tiempo_desarrollo_min ?? "—"} min</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">DTR</p>
            <p className="font-medium">{perfil.dtr_porcentaje ?? "—"}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Óptimo Consumo</p>
            <p className="font-medium">{perfil.fecha_optima_consumo || "—"}</p>
          </div>
        </div>

        {metricas.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead>Antes</TableHead>
                <TableHead>Después</TableHead>
                <TableHead className="text-right">Rendimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricas.map((metrica) => (
                <TableRow key={metrica.tipo_metrica}>
                  <TableCell className="font-medium">{metrica.tipo_metrica}</TableCell>
                  <TableCell>{metrica.valor_antes ?? "—"}</TableCell>
                  <TableCell>{metrica.valor_despues ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {calcularRendimiento(metrica)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">Sin métricas registradas todavía.</p>
        )}
      </CardContent>
    </Card>
  );
}
