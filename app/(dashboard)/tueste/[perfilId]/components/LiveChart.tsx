"use client";

import { RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import type { HitoRecord, PuntoTemperatura } from "../types";

interface LiveChartProps {
  puntos: PuntoTemperatura[];
  hitos: HitoRecord[];
  currentMinute: number;
  isMobile: boolean;
  chartRef: RefObject<HTMLDivElement | null>;
}

export function LiveChart({
  puntos,
  hitos,
  currentMinute,
  isMobile,
  chartRef,
}: LiveChartProps) {
  const chartData = puntos.map((p) => ({
    minuto: p.minuto,
    temperatura: p.temperatura,
  }));

  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <h3 className="text-sm font-medium mb-3">Curva de Tueste en Vivo</h3>
        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="minuto"
                type="number"
                domain={[0, Math.max(18, currentMinute + 2)]}
                tick={{ fontSize: isMobile ? 11 : 13 }}
                label={{
                  value: "Minutos",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: isMobile ? 11 : 13 },
                }}
              />
              <YAxis
                domain={[70, 220]}
                tick={{ fontSize: isMobile ? 11 : 13 }}
                label={{
                  value: "°C",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: isMobile ? 11 : 13 },
                }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="temperatura"
                stroke="#ea580c"
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                y={100}
                stroke="#ccc"
                strokeDasharray="5 5"
                label={{ value: "100°C", fontSize: 11 }}
              />
              <ReferenceLine
                y={195}
                stroke="#999"
                strokeDasharray="5 5"
                label={{ value: "195°C", fontSize: 11 }}
              />
              {hitos
                .filter((h) => h.tiempo_min != null)
                .map((h) => (
                  <ReferenceDot
                    key={h.tipo_hito}
                    x={h.tiempo_min!}
                    y={h.temperatura!}
                    r={6}
                    fill="#f97316"
                    stroke="#fff"
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
