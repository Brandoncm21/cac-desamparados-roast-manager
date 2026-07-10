"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ResumenTueste } from "../types";

interface SummaryProps {
  resumen: ResumenTueste;
}

export function Summary({ resumen }: SummaryProps) {
  return (
    <Card className="border-2 border-green-200 bg-green-50">
      <CardContent className="p-4 md:p-6 space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-green-800">Resumen del Tueste</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
          <div className="p-3 bg-white rounded-lg">
            <p className="text-muted-foreground text-xs">Tiempo Desarrollo</p>
            <p className="text-lg font-bold">{resumen.tiempo_desarrollo_min || "-"} min</p>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="text-muted-foreground text-xs">DTR</p>
            <p className="text-lg font-bold">{resumen.dtr_porcentaje || "-"}%</p>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="text-muted-foreground text-xs">Óptimo Consumo</p>
            <p className="text-lg font-bold">{resumen.fecha_optima_consumo || "-"}</p>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <p className="text-muted-foreground text-xs">Vencimiento</p>
            <p className="text-lg font-bold">{resumen.fecha_vencimiento || "-"}</p>
          </div>
        </div>
        {resumen.metricas.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Métricas</h3>
            {resumen.metricas.map((m) => (
              <div
                key={m.tipo_metrica}
                className="flex justify-between text-sm py-2 px-3 bg-white rounded-lg mb-1"
              >
                <span className="font-medium">{m.tipo_metrica}</span>
                <span>
                  Antes: {m.valor_antes} → Después: {m.valor_despues} (
                  {m.porcentaje_diferencia}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
