"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  saveTemperaturaLocal, getTemperaturasLocal,
  saveHitoLocal, getHitosLocal,
  addToSyncQueue,
  type TemperaturaRecord, type HitoRecord,
} from "@/lib/offline/db";
import { syncAll, getSyncStatus } from "@/lib/offline/sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Cloud, CloudOff, CheckCircle2, Thermometer, Flag, Download,
  Plus, Trash2, Pencil, Save, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";

const HITOS_RAPIDOS = [
  "Turning Point", "Amarillo", "Marrón", "Crack Inicial",
  "Crack Final", "Segundo Crack", "Final", "Tiempo Enfriamiento",
] as const;

type Empleado = { id_empleado: number; nombre: string; rol: string };

type AjusteLocal = {
  id?: number;
  orden_secuencia: number;
  tiempo: string;
  temperatura_ajuste: string;
  llama: string;
  aire: string;
  _isNew?: boolean;
};

type MetricaLocal = {
  tipo_metrica: string;
  valor_antes: string;
  valor_despues: string;
};

export default function CapturaTuestePage() {
  const params = useParams<{ perfilId: string }>();
  const router = useRouter();
  const perfilId = Number(params.perfilId);

  const [isOnline, setIsOnline] = useState(true);
  const [temperatura, setTemperatura] = useState("");
  const [minutoManual, setMinutoManual] = useState("");
  const [timeStep, setTimeStep] = useState<1 | 0.5>(1);
  const [puntos, setPuntos] = useState<{ minuto: number; temperatura: number }[]>([]);
  const [hitos, setHitos] = useState<HitoRecord[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [showResumen, setShowResumen] = useState(false);
  const [resumen, setResumen] = useState<Record<string, unknown> | null>(null);
  const [perfil, setPerfil] = useState<Record<string, unknown> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [editContext, setEditContext] = useState(false);
  const [ctxNombreCafe, setCtxNombreCafe] = useState("");
  const [ctxIdTostador, setCtxIdTostador] = useState<string>("");
  const [ctxTempSala, setCtxTempSala] = useState("");
  const [ctxHumSala, setCtxHumSala] = useState("");

  const [metricas, setMetricas] = useState<MetricaLocal[]>([
    { tipo_metrica: "Peso", valor_antes: "", valor_despues: "" },
    { tipo_metrica: "Humedad", valor_antes: "", valor_despues: "" },
    { tipo_metrica: "Densidad", valor_antes: "", valor_despues: "" },
  ]);

  const [ajustes, setAjustes] = useState<AjusteLocal[]>([]);
  const [ajustesOpen, setAjustesOpen] = useState(false);
  const [editHitosOpen, setEditHitosOpen] = useState(false);
  const [editHitosData, setEditHitosData] = useState<Record<string, { tiempo_min: string; temperatura: string }>>({});

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
    if (!Number.isFinite(perfilId) || perfilId <= 0) {
      toast.error("Perfil de tueste inválido");
      router.push("/tueste");
      return;
    }

    const loadData = async () => {
      const supabase = createClient();

      const { data: empData } = await supabase
        .from("empleados")
        .select("id_empleado, nombre, rol")
        .eq("activo", true)
        .order("nombre");
      if (empData) setEmpleados(empData);

      const { data: perfilData } = await supabase
        .from("perfiles_tueste")
        .select("*, empleados!perfiles_tueste_id_tostador_fkey(nombre), ordenes_trabajo(numero_factura)")
        .eq("id_perfil", perfilId)
        .is("deleted_at", null)
        .single();
      if (perfilData) {
        setPerfil(perfilData);
        setCtxNombreCafe((perfilData.nombre_cafe as string) || "");
        setCtxIdTostador(perfilData.id_tostador ? String(perfilData.id_tostador) : "");
        setCtxTempSala(perfilData.temperatura_sala ? String(perfilData.temperatura_sala) : "");
        setCtxHumSala(perfilData.humedad_sala ? String(perfilData.humedad_sala) : "");
      }

      const { data: metricasData } = await supabase
        .from("metricas_tueste")
        .select("*")
        .eq("id_perfil", perfilId);
      if (metricasData) {
        setMetricas((prev) =>
          prev.map((m) => {
            const found = metricasData.find((d) => d.tipo_metrica === m.tipo_metrica);
            return found
              ? {
                  ...m,
                  valor_antes: found.valor_antes != null ? String(found.valor_antes) : "",
                  valor_despues: found.valor_despues != null ? String(found.valor_despues) : "",
                }
              : m;
          })
        );
      }

      const { data: ajustesData } = await supabase
        .from("ajustes_tueste")
        .select("*")
        .eq("id_perfil", perfilId)
        .order("orden_secuencia");
      if (ajustesData && ajustesData.length > 0) {
        setAjustes(
          ajustesData.map((a) => ({
            id: a.id_ajuste,
            orden_secuencia: a.orden_secuencia,
            tiempo: a.tiempo != null ? String(a.tiempo) : "",
            temperatura_ajuste: a.temperatura_ajuste != null ? String(a.temperatura_ajuste) : "",
            llama: a.llama || "",
            aire: a.aire || "",
          }))
        );
      }

      const localTemp = await getTemperaturasLocal(perfilId);
      const localHitos = await getHitosLocal(perfilId);

      if (localTemp.length > 0) {
        const pts = localTemp.map((t) => ({ minuto: t.minuto, temperatura: t.temperatura_registrada }));
        setPuntos(pts);
        setCurrentMinute(Math.max(...pts.map((p) => p.minuto)) + timeStep);
      } else {
        const { data: serverTemp } = await supabase
          .from("trazabilidad_temperatura")
          .select("*")
          .eq("id_perfil", perfilId)
          .order("minuto");
        if (serverTemp?.length) {
          setPuntos(serverTemp.map((t) => ({ minuto: Number(t.minuto), temperatura: t.temperatura_registrada })));
          setCurrentMinute(Math.max(...serverTemp.map((t) => Number(t.minuto))) + timeStep);
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
  }, [perfilId, router, timeStep]);

  const registrarTemperatura = useCallback(async () => {
    const temp = Number(temperatura);
    if (temp < 70 || temp > 220) {
      toast.error("Temperatura debe estar entre 70°C y 220°C");
      return;
    }
    const minuto = minutoManual !== "" ? Number(minutoManual) : currentMinute;
    if (minuto < 0) {
      toast.error("Minuto inválido");
      return;
    }
    const record: TemperaturaRecord = { id_perfil: perfilId, minuto, temperatura_registrada: temp, synced: false };
    await saveTemperaturaLocal(record);
    await addToSyncQueue({ table: "trazabilidad_temperatura", data: record, id_perfil: perfilId });
    setPuntos((prev) => {
      const filtered = prev.filter((p) => p.minuto !== minuto);
      return [...filtered, { minuto, temperatura: temp }].sort((a, b) => a.minuto - b.minuto);
    });
    if (minutoManual === "") {
      setCurrentMinute((prev) => prev + timeStep);
    }
    setTemperatura("");
    setMinutoManual("");
    inputRef.current?.focus();
    if (isOnline) syncAll();
  }, [temperatura, minutoManual, currentMinute, perfilId, isOnline, timeStep]);

  const registrarHito = useCallback(async (tipoHito: string) => {
    const temp = Number(temperatura) || (puntos.length > 0 ? puntos[puntos.length - 1]?.temperatura ?? 0 : 0);
    const record: HitoRecord = { id_perfil: perfilId, tipo_hito: tipoHito, tiempo_min: currentMinute, temperatura: temp, synced: false };
    await saveHitoLocal(record);
    await addToSyncQueue({ table: "hitos_termicos", data: record, id_perfil: perfilId });
    setHitos((prev) => [...prev.filter((h) => h.tipo_hito !== tipoHito), record]);
    toast.success(`${tipoHito} registrado`);
    if (isOnline) syncAll();
  }, [temperatura, puntos, currentMinute, perfilId, isOnline]);

  const guardarContexto = async () => {
    const supabase = createClient();
    const updateData: Record<string, unknown> = {
      nombre_cafe: ctxNombreCafe || null,
      id_tostador: ctxIdTostador ? Number(ctxIdTostador) : null,
      temperatura_sala: ctxTempSala ? Number(ctxTempSala) : null,
      humedad_sala: ctxHumSala ? Number(ctxHumSala) : null,
    };
    const { error } = await supabase
      .from("perfiles_tueste")
      .update(updateData)
      .eq("id_perfil", perfilId);
    if (error) {
      toast.error("Error al guardar contexto");
      return;
    }
    setPerfil((prev) => prev ? { ...prev, ...updateData } : prev);
    setEditContext(false);
    toast.success("Contexto guardado");
  };

  const guardarMetrica = async (tipo: string, antes: string, despues: string) => {
    const body = {
      valor_antes: antes ? Number(antes) : null,
      valor_despues: despues ? Number(despues) : null,
    };
    const res = await fetch(`/api/perfiles-tueste/${perfilId}/metricas/${encodeURIComponent(tipo)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error(`Error al guardar métrica ${tipo}`);
    }
  };

  const guardarAjuste = async (ajuste: AjusteLocal, index: number) => {
    const body = {
      orden_secuencia: ajuste.orden_secuencia,
      tiempo: ajuste.tiempo ? Number(ajuste.tiempo) : null,
      temperatura_ajuste: ajuste.temperatura_ajuste ? Number(ajuste.temperatura_ajuste) : null,
      llama: ajuste.llama || null,
      aire: ajuste.aire || null,
    };
    const res = await fetch(`/api/perfiles-tueste/${perfilId}/ajustes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setAjustes((prev) =>
        prev.map((a, i) =>
          i === index ? { ...a, id: data.data.id_ajuste, _isNew: false } : a
        )
      );
      toast.success("Ajuste guardado");
    } else {
      toast.error("Error al guardar ajuste");
    }
  };

  const eliminarAjuste = (index: number) => {
    setAjustes((prev) => prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, orden_secuencia: i + 1 })));
  };

  const agregarAjuste = () => {
    setAjustes((prev) => [
      ...prev,
      { orden_secuencia: prev.length + 1, tiempo: "", temperatura_ajuste: "", llama: "", aire: "", _isNew: true },
    ]);
  };

  const guardarTodosHitos = async () => {
    const supabase = createClient();
    for (const [tipoHito, data] of Object.entries(editHitosData)) {
      await supabase
        .from("hitos_termicos")
        .upsert(
          {
            id_perfil: perfilId,
            tipo_hito: tipoHito,
            tiempo_min: data.tiempo_min ? Number(data.tiempo_min) : null,
            temperatura: data.temperatura ? Number(data.temperatura) : null,
          },
          { onConflict: "id_perfil, tipo_hito" }
        );
    }
    const { data: updatedHitos } = await supabase
      .from("hitos_termicos")
      .select("*")
      .eq("id_perfil", perfilId);
    if (updatedHitos) setHitos(updatedHitos.map((h) => ({ ...h, synced: true })));
    setEditHitosOpen(false);
    toast.success("Hitos actualizados");
  };

  const finalizarTueste = async () => {
    if (isOnline) {
      await syncAll();
      const supabase = createClient();
      const { data } = await supabase
        .from("perfiles_tueste")
        .select("tiempo_desarrollo_min, dtr_porcentaje, fecha_optima_consumo, fecha_vencimiento, estado")
        .eq("id_perfil", perfilId)
        .single();
      const { data: metricasData } = await supabase.from("metricas_tueste").select("*").eq("id_perfil", perfilId);
      setResumen({ ...data, metricas: metricasData || [] });
      await supabase
        .from("perfiles_tueste")
        .update({ estado: "Completado" })
        .eq("id_perfil", perfilId);
    } else {
      toast.error("Conéctese a internet para ver el resumen");
    }
    setShowResumen(true);
  };

  const descargarPDF = async () => {
    if (!pdfRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf()
      .from(pdfRef.current)
      .set({
        margin: 8,
        filename: `perfil-tueste-${perfilId}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  };

  const calcularDiferencia = (antes: string, despues: string): string => {
    const a = Number(antes);
    const d = Number(despues);
    if (!a || !d || a === 0) return "-";
    return (((a - d) / a) * 100).toFixed(2);
  };

  const chartData = puntos.map((p) => ({ minuto: p.minuto, temperatura: p.temperatura }));
  const numeroFactura = (perfil?.["ordenes_trabajo"] as Record<string, unknown> | null)?.["numero_factura"] as string | undefined;
  const nombreTostador = (perfil?.["empleados"] as Record<string, unknown> | null)?.["nombre"] as string | undefined;

  useEffect(() => {
    if (editHitosOpen) {
      const data: Record<string, { tiempo_min: string; temperatura: string }> = {};
      HITOS_RAPIDOS.forEach((h) => {
        const found = hitos.find((hi) => hi.tipo_hito === h);
        data[h] = {
          tiempo_min: found?.tiempo_min != null ? String(found.tiempo_min) : "",
          temperatura: found?.temperatura != null ? String(found.temperatura) : "",
        };
      });
      setEditHitosData(data);
    }
  }, [editHitosOpen, hitos]);

  return (
    <div ref={pdfRef} className="max-w-4xl mx-auto space-y-4 md:space-y-6 pb-32 px-0 md:px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-12 lg:pt-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold break-words">
            {perfil?.["nombre_cafe"] as string || `Perfil #${perfilId}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Lote: {perfil?.["numero_lote"] as string || "-"} | Minuto: {currentMinute}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={descargarPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
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

      {/* Context Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Contexto del Tueste</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditContext(!editContext)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {editContext ? "Cancelar" : "Editar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <p className="text-sm font-medium">{perfil?.["fecha_tueste"] as string || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nº Factura</Label>
              <p className="text-sm font-medium">{numeroFactura || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tostador</Label>
              {editContext ? (
                <Select value={ctxIdTostador} onValueChange={(v) => setCtxIdTostador(v || "")}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((e) => (
                      <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>
                        {e.nombre} ({e.rol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{nombreTostador || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Café</Label>
              {editContext ? (
                <Input value={ctxNombreCafe} onChange={(e) => setCtxNombreCafe(e.target.value)} className="h-8 text-sm" />
              ) : (
                <p className="text-sm font-medium">{ctxNombreCafe || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Temp. Sala (°C)</Label>
              {editContext ? (
                <Input type="number" value={ctxTempSala} onChange={(e) => setCtxTempSala(e.target.value)} className="h-8 text-sm" />
              ) : (
                <p className="text-sm font-medium">{ctxTempSala || "-"} °C</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Humedad Sala (%)</Label>
              {editContext ? (
                <Input type="number" value={ctxHumSala} onChange={(e) => setCtxHumSala(e.target.value)} className="h-8 text-sm" />
              ) : (
                <p className="text-sm font-medium">{ctxHumSala || "-"} %</p>
              )}
            </div>
          </div>
          {editContext && (
            <Button size="sm" className="mt-3" onClick={guardarContexto}>
              <Save className="h-3.5 w-3.5 mr-1" /> Guardar Contexto
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Rendimientos */}
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
                            prev.map((mm) => mm.tipo_metrica === m.tipo_metrica ? { ...mm, valor_antes: newVal } : mm)
                          );
                        }}
                        onBlur={() => guardarMetrica(m.tipo_metrica, m.valor_antes, m.valor_despues)}
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
                            prev.map((mm) => mm.tipo_metrica === m.tipo_metrica ? { ...mm, valor_despues: newVal } : mm)
                          );
                        }}
                        onBlur={() => guardarMetrica(m.tipo_metrica, m.valor_antes, m.valor_despues)}
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

      {/* Temperature Input */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-orange-800">Paso:</Label>
              <Button
                variant={timeStep === 1 ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setTimeStep(1)}
              >
                1 min
              </Button>
              <Button
                variant={timeStep === 0.5 ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setTimeStep(0.5)}
              >
                0.5 min
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-orange-800">Minuto:</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={minutoManual}
                onChange={(e) => setMinutoManual(e.target.value)}
                className="h-7 w-20 text-xs text-center"
                placeholder="Auto"
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium text-orange-800 mb-1.5 block">
                Temperatura (°C) — Minuto {minutoManual || currentMinute}
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Hitos Rápidos</h3>
          <Dialog open={editHitosOpen} onOpenChange={setEditHitosOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm" />
              }
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar Hitos
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Hitos</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {HITOS_RAPIDOS.map((hito) => (
                  <div key={hito} className="grid grid-cols-3 gap-2 items-center">
                    <span className="text-sm font-medium">{hito}</span>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Tiempo (min)"
                      value={editHitosData[hito]?.tiempo_min || ""}
                      onChange={(e) =>
                        setEditHitosData((prev) => ({
                          ...prev,
                          [hito]: { tiempo_min: e.target.value, temperatura: prev[hito]?.temperatura || "" },
                        }))
                      }
                      className="h-8 text-sm text-center"
                    />
                    <Input
                      type="number"
                      placeholder="Temp (°C)"
                      value={editHitosData[hito]?.temperatura || ""}
                      onChange={(e) =>
                        setEditHitosData((prev) => ({
                          ...prev,
                          [hito]: { tiempo_min: prev[hito]?.tiempo_min || "", temperatura: e.target.value },
                        }))
                      }
                      className="h-8 text-sm text-center"
                    />
                  </div>
                ))}
                <Button onClick={guardarTodosHitos} className="w-full">
                  <Save className="h-4 w-4 mr-1" /> Guardar Hitos
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Ajustes de Máquina */}
      <Card>
        <CardHeader className="pb-2">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setAjustesOpen(!ajustesOpen)}
          >
            <CardTitle className="text-sm font-medium">Ajustes durante el Tueste</CardTitle>
            {ajustesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {ajustesOpen && (
          <CardContent>
            <div className="space-y-2">
              {ajustes.length > 0 && (
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <span>Minuto</span>
                  <span>Temp (°C)</span>
                  <span>Llama</span>
                  <span>Aire</span>
                  <span></span>
                </div>
              )}
              {ajustes.map((ajuste, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-center">
                  <Input
                    type="number"
                    step="0.5"
                    value={ajuste.tiempo}
                    onChange={(e) => {
                      setAjustes((prev) =>
                        prev.map((a, i) => i === index ? { ...a, tiempo: e.target.value } : a)
                      );
                    }}
                    className="h-8 text-sm text-center"
                    placeholder="0"
                  />
                  <Input
                    type="number"
                    value={ajuste.temperatura_ajuste}
                    onChange={(e) => {
                      setAjustes((prev) =>
                        prev.map((a, i) => i === index ? { ...a, temperatura_ajuste: e.target.value } : a)
                      );
                    }}
                    className="h-8 text-sm text-center"
                    placeholder="°C"
                  />
                  <Input
                    value={ajuste.llama}
                    onChange={(e) => {
                      setAjustes((prev) =>
                        prev.map((a, i) => i === index ? { ...a, llama: e.target.value } : a)
                      );
                    }}
                    className="h-8 text-sm text-center"
                    placeholder="%"
                  />
                  <Input
                    value={ajuste.aire}
                    onChange={(e) => {
                      setAjustes((prev) =>
                        prev.map((a, i) => i === index ? { ...a, aire: e.target.value } : a)
                      );
                    }}
                    className="h-8 text-sm text-center"
                    placeholder="%"
                  />
                  <div className="flex gap-1">
                    {ajuste._isNew !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => guardarAjuste(ajuste, index)}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500"
                      onClick={() => eliminarAjuste(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={agregarAjuste} className="w-full mt-2">
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Ajuste
              </Button>
            </div>
          </CardContent>
        )}
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
                <p className="text-lg font-bold">{resumen["tiempo_desarrollo_min"] as string || "-"} min</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">DTR</p>
                <p className="text-lg font-bold">{resumen["dtr_porcentaje"] as string || "-"}%</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">Óptimo Consumo</p>
                <p className="text-lg font-bold">{resumen["fecha_optima_consumo"] as string || "-"}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-muted-foreground text-xs">Vencimiento</p>
                <p className="text-lg font-bold">{resumen["fecha_vencimiento"] as string || "-"}</p>
              </div>
            </div>
            {(resumen["metricas"] as Array<Record<string, unknown>>)?.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Métricas</h3>
                {(resumen["metricas"] as Array<Record<string, unknown>>).map((m) => (
                  <div key={m["tipo_metrica"] as string} className="flex justify-between text-sm py-2 px-3 bg-white rounded-lg mb-1">
                    <span className="font-medium">{m["tipo_metrica"] as string}</span>
                    <span>Antes: {m["valor_antes"] as string} → Después: {m["valor_despues"] as string} ({m["porcentaje_diferencia"] as string}%)</span>
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
