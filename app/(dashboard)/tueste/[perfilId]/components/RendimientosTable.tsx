"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MetricaLocal } from "../types";

interface RendimientosTableProps {
  metricas: MetricaLocal[];
  setMetricas: React.Dispatch<React.SetStateAction<MetricaLocal[]>>;
  calcularDiferencia: (antes: string, despues: string) => string;
  onGuardarMetrica: (tipo: string, antes: string, despues: string) => Promise<void>;
}

export function RendimientosTable({
  metricas,
  setMetricas,
  calcularDiferencia,
  onGuardarMetrica,
}: RendimientosTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Rendimientos / Mermas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Métrica</th>
                <th className="text-center py-2 font-medium">Antes</th>
                <th className="text-center py-2 font-medium">Después</th>
                <th className="text-center py-2 font-medium">% Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => (
                <tr key={m.tipo_metrica} className="border-b last:border-0">
                  <td className="py-2 font-medium">{m.tipo_metrica}</td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      value={m.valor_antes}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setMetricas((prev) =>
                          prev.map((mm) =>
                            mm.tipo_metrica === m.tipo_metrica
                              ? { ...mm, valor_antes: newVal }
                              : mm
                          )
                        );
                      }}
                      onBlur={() => onGuardarMetrica(m.tipo_metrica, m.valor_antes, m.valor_despues)}
                      className="h-8 text-center text-sm"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      value={m.valor_despues}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setMetricas((prev) =>
                          prev.map((mm) =>
                            mm.tipo_metrica === m.tipo_metrica
                              ? { ...mm, valor_despues: newVal }
                              : mm
                          )
                        );
                      }}
                      onBlur={() => onGuardarMetrica(m.tipo_metrica, m.valor_antes, m.valor_despues)}
                      className="h-8 text-center text-sm"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 text-center font-mono font-bold text-orange-700">
                    {calcularDiferencia(m.valor_antes, m.valor_despues)}
                    {calcularDiferencia(m.valor_antes, m.valor_despues) !== "-" && "%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
