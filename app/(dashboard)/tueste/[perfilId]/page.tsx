"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveTemperaturaLocal, getTemperaturasLocal, saveHitoLocal, getHitosLocal, addToSyncQueue, type TemperaturaRecord, type HitoRecord } from "@/lib/offline/db";
import { syncAll, getSyncStatus } from "@/lib/offline/sync";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Cloud, CloudOff, CheckCircle2, Thermometer, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";

const HITOS_RAPIDOS = [
  "Turning Point", "Amarillo", "Marrón", "Crack Inicial",
  "Crack Final", "Segundo Crack", "Final", "Tiempo Enfriamiento",
] as const;

export default function CapturaTuestePage() {
  const params = useParams<{ perfilId: string }>();
  const router = useRouter();
  const perfilId = Number(params.perfilId);
  const [isOnline, setIsOnline] = useState(true);
  const [temperatura, setTemperatura] = useState("");
  const [puntos, setPuntos] = useState<{ minuto: number; temperatura: number }[]>([]);
  const [hitos, setHitos] = useState<HitoRecord[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [showResumen, setShowResumen] = useState(false);
  const [resumen, setResumen] = useState<Record<string, unknown> | null>(null);
  const [perfil, setPerfil] = useState<Record<string, unknown> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setIsOnline(getSyncStatus() === "online");
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: perfilData } = await supabase
        .from("perfiles_tueste")
        .select("*")
        .eq("id_perfil", perfilId)
        .single();
      if (perfilData) setPerfil(perfilData);

      const localTemp = await getTemperaturasLocal(perfilId);
      const localHitos = await getHitosLocal(perfilId);

      if (localTemp.length > 0) {
        const pts = localTemp.map((t) => ({ minuto: t.minuto, temperatura: t.temperatura_registrada }));
        setPuntos(pts);
        setCurrentMinute(pts.length);
      } else {
        const { data: serverTemp } = await supabase
          .from("trazabilidad_temperatura")
          .select("*")
          .eq("id_perfil", perfilId)
          .order("minuto");
        if (serverTemp?.length) {
          setPuntos(serverTemp.map((t) => ({ minuto: t.minuto, temperatura: t.temperatura_registrada })));
          setCurrentMinute(serverTemp.length);
        }
      }

      if (localHitos.length > 0) {
        setHitos(localHitos);
      } else {
        const { data: serverHitos } = await supabase
          .from("hitos_termicos")
          .select("*")
          .eq("id_perfil", perfilId);
        if (serverHitos) setHitos(serverHitos.map((h) => ({ ...h, synced: true })));
      }
    };
    loadData();
  }, [perfilId]);

  const registrarTemperatura = useCallback(async () => {
    const temp = Number(temperatura);
    if (temp < 70 || temp > 220) {
      toast.error("Temperatura debe estar entre 70°C y 220°C");
      return;
    }
    const record: TemperaturaRecord = { id_perfil: perfilId, minuto: currentMinute, temperatura_registrada: temp, synced: false };
    await saveTemperaturaLocal(record);
    await addToSyncQueue({ table: "trazabilidad_temperatura", data: record, id_perfil: perfilId });
    setPuntos((prev) => [...prev, { minuto: currentMinute, temperatura: temp }]);
    setCurrentMinute((prev) => prev + 1);
    setTemperatura("");
    inputRef.current?.focus();
    if (isOnline) syncAll();
  }, [temperatura, currentMinute, perfilId, isOnline]);

  const registrarHito = useCallback(async (tipoHito: string) => {
    const temp = Number(temperatura) || (puntos.length > 0 ? puntos[puntos.length - 1].temperatura : 0);
    const record: HitoRecord = { id_perfil: perfilId, tipo_hito: tipoHito, tiempo_min: currentMinute, temperatura: temp, synced: false };
    await saveHitoLocal(record);
    await addToSyncQueue({ table: "hitos_termicos", data: record, id_perfil: perfilId });
    setHitos((prev) => [...prev.filter((h) => h.tipo_hito !== tipoHito), record]);
    toast.success(`${tipoHito} registrado`);
    if (isOnline) syncAll();
  }, [temperatura, puntos, currentMinute, perfilId, isOnline]);

  const finalizarTueste = async () => {
    if (isOnline) {
      await syncAll();
      const supabase = createClient();
      const { data } = await supabase
        .from("perfiles_tueste")
        .select("tiempo_desarrollo_min, dtr_porcentaje, fecha_optima_consumo, fecha_vencimiento")
        .eq("id_perfil", perfilId)
        .single();
      const { data: metricas } = await supabase.from("metricas_tueste").select("*").eq("id_perfil", perfilId);
      setResumen({ ...data, metricas: metricas || [] });
    } else {
      toast.error("Conéctese a internet para ver el resumen");
    }
    setShowResumen(true);
  };

  const chartData = puntos.map((p) => ({ minuto: p.minuto, temperatura: p.temperatura }));

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 pb-32 px-0 md:px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-12 lg:pt-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold break-words">
            {perfil?.nombre_cafe as string || `Perfil #${perfilId}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Lote: {perfil?.numero_lote as string || "-"} | Minuto: {currentMinute}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium px-3 py-1.5 bg-green-50 rounded-full">
              <Cloud className="h-4 w-4" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium px-3 py-1.5 bg-red-50 rounded-full">
              <CloudOff className="h-4 w-4" /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Temperature Input */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium text-orange-800 mb-1.5 block">
                Temperatura (°C) — Minuto {currentMinute}
              </label>
              <Input
                ref={inputRef}
                type="number"
                placeholder="Ej: 195"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && registrarTemperatura()}
                className="h-16 md:h-20 text-2xl md:text-4xl text-center font-bold"
                autoFocus
              />
            </div>
            <Button
              onClick={registrarTemperatura}
              className="h-16 md:h-20 w-full md:w-auto px-6 md:px-10 text-base md:text-lg font-bold shrink-0"
              size="lg"
            >
              <Thermometer className="h-5 w-5 md:h-6 md:w-6 mr-2" />
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Milestones */}
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Hitos Rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {HITOS_RAPIDOS.map((hito) => {
            const isRegistered = hitos.some((h) => h.tipo_hito === hito);
            return (
              <Button
                key={hito}
                variant={isRegistered ? "default" : "outline"}
                className={cn(
                  "h-14 md:h-16 text-xs md:text-sm whitespace-normal",
                  isRegistered && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => registrarHito(hito)}
                disabled={isRegistered}
              >
                <Flag className="h-4 w-4 mr-1 shrink-0" />
                <span className="leading-tight">{hito}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Live Chart */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <h3 className="text-sm font-medium mb-3">Curva de Tueste en Vivo</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="minuto"
                type="number"
                domain={[0, Math.max(18, currentMinute + 2)]}
                tick={{ fontSize: isMobile ? 11 : 13 }}
                label={{ value: "Minutos", position: "insideBottom", offset: -5, style: { fontSize: isMobile ? 11 : 13 } }}
              />
              <YAxis
                domain={[70, 220]}
                tick={{ fontSize: isMobile ? 11 : 13 }}
                label={{ value: "°C", angle: -90, position: "insideLeft", style: { fontSize: isMobile ? 11 : 13 } }}
              />
              <Tooltip />
              <Line type="monotone" dataKey="temperatura" stroke="#ea580c" strokeWidth={2} dot={false} />
              <ReferenceLine y={100} stroke="#ccc" strokeDasharray="5 5" label={{ value: "100°C", fontSize: 11 }} />
              <ReferenceLine y={195} stroke="#999" strokeDasharray="5 5" label={{ value: "195°C", fontSize: 11 }} />
              {hitos.filter((h) => h.tiempo_min != null).map((h) => (
                <ReferenceDot key={h.tipo_hito} x={h.tiempo_min!} y={h.temperatura!} r={6} fill="#f97316" stroke="#fff" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Registered Milestones */}
      {hitos.length > 0 && (
        <Card>
          <CardContent className="p-3 md:p-4">
            <h3 className="text-sm font-medium mb-2">Hitos Registrados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {hitos.map((h) => (
                <div key={h.tipo_hito} className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg min-h-[48px]">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="font-medium text-sm">{h.tipo_hito}:</span>
                  <span className="text-sm">{h.tiempo_min} min / {h.temperatura}°C</span>
                  {!h.synced && <CloudOff className="h-4 w-4 text-amber-500 ml-auto shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {showResumen && resumen && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4 md:p-6 space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-green-800">Resumen del Tueste</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">Tiempo Desarrollo</p>
                <p className="text-lg font-bold">{resumen.tiempo_desarrollo_min as string || "-"} min</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">DTR</p>
                <p className="text-lg font-bold">{resumen.dtr_porcentaje as string || "-"}%</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">Óptimo Consumo</p>
                <p className="text-lg font-bold">{resumen.fecha_optima_consumo as string || "-"}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">Vencimiento</p>
                <p className="text-lg font-bold">{resumen.fecha_vencimiento as string || "-"}</p>
              </div>
            </div>
            {(resumen.metricas as Array<Record<string, unknown>>)?.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Métricas</h3>
                {(resumen.metricas as Array<Record<string, unknown>>).map((m) => (
                  <div key={m.tipo_metrica as string} className="flex justify-between text-sm py-2 px-3 bg-white rounded-lg mb-1">
                    <span className="font-medium">{m.tipo_metrica as string}</span>
                    <span>Antes: {m.valor_antes as string} → Después: {m.valor_despues as string} ({m.porcentaje_diferencia as string}%)</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finalize */}
      {!showResumen ? (
        <Button onClick={finalizarTueste} className="w-full h-14 md:h-16 text-base md:text-lg font-bold" size="lg">
          Finalizar Tueste y Ver Resumen
        </Button>
      ) : (
        <Button onClick={() => router.push("/tueste")} variant="outline" className="w-full h-14 md:h-12">
          Volver a lista de perfiles
        </Button>
      )}
    </div>
  );
}
