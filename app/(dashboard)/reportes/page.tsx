"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface PerfilConCurva {
  id_perfil: number;
  numero_lote: string | null;
  nombre_cafe: string | null;
  temperaturas: { minuto: number; temperatura_registrada: number }[];
}

export default function ReportesPage() {
  const supabase = createClient();
  const [perfiles, setPerfiles] = useState<PerfilConCurva[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [proximosVencer, setProximosVencer] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: vencidos } = await supabase
        .from("perfiles_tueste")
        .select("id_perfil, numero_lote, nombre_cafe, fecha_vencimiento, fecha_optima_consumo")
        .lte("fecha_vencimiento", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("fecha_vencimiento");

      if (vencidos) setProximosVencer(vencidos);

      const { data: perfilesData } = await supabase
        .from("perfiles_tueste")
        .select("id_perfil, numero_lote, nombre_cafe")
        .order("fecha_tueste", { ascending: false });

      if (perfilesData) {
        const withCurvas = await Promise.all(
          perfilesData.map(async (p) => {
            const { data: temps } = await supabase
              .from("trazabilidad_temperatura")
              .select("minuto, temperatura_registrada")
              .eq("id_perfil", p.id_perfil)
              .order("minuto");
            return { ...p, temperaturas: temps || [] };
          })
        );
        setPerfiles(withCurvas);
      }
    };
    load();
  }, [supabase]);

  const togglePerfil = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedData = perfiles
    .filter((p) => selectedIds.includes(p.id_perfil))
    .filter((p) => p.temperaturas.length > 0);

  const chartData: Record<string, unknown>[] = [];
  if (selectedData.length > 0) {
    const maxMin = Math.max(...selectedData.flatMap((p) => p.temperaturas.map((t) => t.minuto)));
    for (let m = 0; m <= maxMin; m++) {
      const point: Record<string, unknown> = { minuto: m };
      for (const p of selectedData) {
        const temp = p.temperaturas.find((t) => t.minuto === m);
        if (temp) {
          point[p.numero_lote || `Perfil ${p.id_perfil}`] = temp.temperatura_registrada;
        }
      }
      chartData.push(point);
    }
  }

  const COLORS = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>

      {/* Próximos a vencer */}
      {proximosVencer.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Lotes Próximos a Vencer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {proximosVencer.map((p) => (
              <div key={p.id_perfil as number} className="flex justify-between">
                <span className="font-medium">{p.numero_lote as string || `Perfil #${p.id_perfil}`}</span>
                <span>{p.nombre_cafe as string}</span>
                <span className="text-red-600 font-medium">Vence: {p.fecha_vencimiento as string}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Curvas comparativas */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativa de Curvas de Tueste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {perfiles.map((p) => (
              <button
                key={p.id_perfil}
                onClick={() => togglePerfil(p.id_perfil)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedIds.includes(p.id_perfil)
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white hover:bg-zinc-50"
                }`}
              >
                {p.numero_lote || `#${p.id_perfil}`}
              </button>
            ))}
          </div>

          {selectedData.length > 0 ? (
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
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Seleccione uno o más perfiles para comparar curvas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historial de tuestes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Tuestes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {perfiles.map((p) => (
              <div key={p.id_perfil} className="flex justify-between items-center p-3 border rounded-lg hover:bg-zinc-50">
                <div>
                  <p className="font-medium">{p.numero_lote || `Perfil #${p.id_perfil}`}</p>
                  <p className="text-sm text-muted-foreground">{p.nombre_cafe}</p>
                </div>
                <p className="text-sm">{p.temperaturas.length} registros</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
