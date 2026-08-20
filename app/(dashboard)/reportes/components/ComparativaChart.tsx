"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

interface Props {
  chartData: Record<string, unknown>[];
  selectedData: { id_perfil: number; numero_lote: string | null }[];
}

export function ComparativaChart({ chartData, selectedData }: Props) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="minuto" label={{ value: "Minutos", position: "insideBottom", offset: -5 }} />
        <YAxis domain={[70, 220]} label={{ value: "°C", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        {selectedData.map((p, i) => (
          <Line
            key={p.id_perfil}
            type="monotone"
            dataKey={p.numero_lote || `Perfil ${p.id_perfil}`}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
