"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole, canEditOrder, type UserRole } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Play, CheckCircle2, Flame, Package, Thermometer } from "lucide-react";
import { getCurrentPrecioEmpaque, calcularEmpaques } from "@/lib/services/empacado";

type EstadoPaso = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "OMITIDO";

interface ServicioInfo {
  id_servicio_maestro: number;
  tipo: string;
  nombre: string;
}

interface Paso {
  id_paso: number;
  id_orden: number;
  servicio_id: number;
  prioridad: number;
  estado: EstadoPaso;
  peso_inicial_kg: number | null;
  peso_final_kg: number | null;
  peso_facturable_kg: number | null;
  merma_kg: number | null;
  snapshot_precio_kg: number | null;
  subtotal_servicio: number | null;
  empaque_id: number | null;
  cantidad_empaques: number | null;
  snapshot_precio_empaque: number | null;
  costo_empaques: number | null;
  costo_total_paso: number | null;
  observaciones: string | null;
  servicios_maestro: ServicioInfo;
}

interface Empaque {
  id_empaque: number;
  nombre: string;
  capacidad_kg: number | null;
  empaque_precios: { precio: number; valid_to: string | null; valid_from: string | null }[];
}

interface PerfilTueste {
  id_perfil: number;
}

type DialogAccion = "iniciar" | "cerrar" | "confirmar-tueste" | null;

export function PasosPanel({ idOrden }: { idOrden: number }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [empaques, setEmpaques] = useState<Empaque[]>([]);
  const [perfilTueste, setPerfilTueste] = useState<PerfilTueste | null | undefined>(undefined);
  const [creandoPerfil, setCreandoPerfil] = useState(false);

  const [dialogAccion, setDialogAccion] = useState<DialogAccion>(null);
  const [pasoActivo, setPasoActivo] = useState<Paso | null>(null);
  const [pesoInput, setPesoInput] = useState<string>("");
  const [empaqueInput, setEmpaqueInput] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cargarPasos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ordenes/${idOrden}/pasos`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Error al cargar pasos");
      setPasos(result.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar pasos");
    } finally {
      setLoading(false);
    }
  }, [idOrden]);

  useEffect(() => {
    cargarPasos();
    getCurrentUserRole().then(setUserRole);
  }, [cargarPasos]);

  // Determinar el paso actual: primer paso no completado, orden determinista.
  const pasoActual = useMemo(() => {
    const ordenados = [...pasos].sort(
      (a, b) => a.prioridad - b.prioridad || a.id_paso - b.id_paso
    );
    return ordenados.find((p) => p.estado !== "COMPLETADO" && p.estado !== "OMITIDO") ?? null;
  }, [pasos]);

  const esTuesteActivo = pasoActual?.servicios_maestro.tipo === "tueste";
  const esEmpacadoActivo = pasoActual?.servicios_maestro.tipo === "empacado";

  // Cargar empaques si el paso actual es empacado
  useEffect(() => {
    if (!esEmpacadoActivo) {
      setEmpaques([]);
      return;
    }
    supabase
      .from("empaques")
      .select("id_empaque, nombre, capacidad_kg, empaque_precios(precio, valid_from, valid_to)")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        setEmpaques((data || []) as Empaque[]);
      });
  }, [esEmpacadoActivo, supabase]);

  // Cargar perfil de tueste si el paso actual es tueste
  useEffect(() => {
    if (!esTuesteActivo) {
      setPerfilTueste(undefined);
      return;
    }
    setPerfilTueste(undefined);
    supabase
      .from("perfiles_tueste")
      .select("id_perfil")
      .eq("id_orden", idOrden)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data }) => setPerfilTueste(data as PerfilTueste | null));
  }, [esTuesteActivo, idOrden, supabase]);

  const abrirDialog = (accion: Exclude<DialogAccion, null>, paso: Paso) => {
    setDialogAccion(accion);
    setPasoActivo(paso);
    setPesoInput("");
    setEmpaqueInput("");
    setObservaciones("");
  };

  const pesoBaseEmpacado = pasoActual?.peso_facturable_kg ?? pasoActual?.peso_inicial_kg;

  const previewEmpacado = useMemo(() => {
    if (dialogAccion !== "cerrar" || !esEmpacadoActivo || !empaqueInput || !pesoBaseEmpacado) return null;
    const empaque = empaques.find((e) => e.id_empaque === Number(empaqueInput));
    if (!empaque) return null;
    const precio = getCurrentPrecioEmpaque(empaque.empaque_precios);
    if (precio == null || empaque.capacidad_kg == null || empaque.capacidad_kg <= 0) return null;
    try {
      return calcularEmpaques({
        pesoDisponible: pesoBaseEmpacado,
        capacidadKg: empaque.capacidad_kg,
        precioUnitario: precio,
      });
    } catch {
      return null;
    }
  }, [dialogAccion, esEmpacadoActivo, empaqueInput, empaques, pesoBaseEmpacado]);

  const irAPerfilTueste = async () => {
    if (!esTuesteActivo || !pasoActual || creandoPerfil) return;
    if (perfilTueste) {
      router.push(`/tueste/${perfilTueste.id_perfil}`);
      return;
    }
    setCreandoPerfil(true);
    try {
      const { data, error } = await supabase
        .from("perfiles_tueste")
        .insert({
          id_orden: idOrden,
          nombre_cafe: `Tueste orden #${idOrden}`,
        })
        .select("id_perfil")
        .single();

      if (error || !data) {
        toast.error("Error al crear perfil de tueste: " + (error?.message || "sin ID"));
        return;
      }
      toast.success("Perfil de tueste creado");
      setPerfilTueste(data as PerfilTueste);
      router.push(`/tueste/${data.id_perfil}`);
    } finally {
      setCreandoPerfil(false);
    }
  };

  const enviar = async () => {
    if (!dialogAccion || !pasoActivo) return;
    setSubmitting(true);
    try {
      const baseUrl = `/api/ordenes/${idOrden}/pasos/${pasoActivo.id_paso}`;
      let url = "";
      let body: Record<string, unknown> = {};

      if (dialogAccion === "iniciar") {
        const pesoNum = Number(pesoInput);
        if (!pesoInput || Number.isNaN(pesoNum) || pesoNum <= 0) {
          toast.error("Ingrese un peso inicial válido");
          return;
        }
        url = `${baseUrl}/iniciar`;
        body = { peso_inicial_kg: pesoNum };
      } else if (dialogAccion === "cerrar") {
        if (esEmpacadoActivo) {
          if (!empaqueInput) {
            toast.error("Seleccione un empaque");
            return;
          }
          url = `${baseUrl}/cerrar`;
          body = { empaque_id: Number(empaqueInput), observaciones: observaciones || null };
        } else {
          url = `${baseUrl}/cerrar`;
          const pesoNum = pesoInput === "" ? null : Number(pesoInput);
          if (pesoInput !== "" && (Number.isNaN(pesoNum) || (pesoNum as number) <= 0)) {
            toast.error("El peso final debe ser un número válido");
            return;
          }
          body = { peso_final_kg: pesoNum, observaciones: observaciones || null };
        }
      } else if (dialogAccion === "confirmar-tueste") {
        const pesoNum = Number(pesoInput);
        if (!pesoInput || Number.isNaN(pesoNum) || pesoNum <= 0) {
          toast.error("Ingrese un peso final válido");
          return;
        }
        url = `${baseUrl}/confirmar-tueste`;
        body = { peso_final_kg: pesoNum, observaciones: observaciones || null };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Error al procesar el paso");

      toast.success(
        dialogAccion === "iniciar"
          ? "Paso iniciado"
          : dialogAccion === "cerrar"
            ? "Paso completado"
            : "Tueste confirmado"
      );
      setDialogAccion(null);
      setPasoActivo(null);
      cargarPasos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el paso");
    } finally {
      setSubmitting(false);
    }
  };

  const estadoBadge = (estado: EstadoPaso) => {
    const colors: Record<string, string> = {
      PENDIENTE: "bg-gray-100 text-gray-600",
      EN_PROCESO: "bg-blue-100 text-blue-800",
      COMPLETADO: "bg-green-100 text-green-800",
      OMITIDO: "bg-orange-100 text-orange-800",
    };
    return colors[estado] || "bg-gray-100 text-gray-600";
  };

  const estadosLabel: Record<EstadoPaso, string> = {
    PENDIENTE: "Pendiente",
    EN_PROCESO: "En proceso",
    COMPLETADO: "Completado",
    OMITIDO: "Omitido",
  };

  const puedeEjecutar = canEditOrder(userRole);

  if (!pasos.length && !loading) return null;

  const totalAcumulado = pasos
    .filter((p) => p.estado === "COMPLETADO")
    .reduce((sum, p) => sum + (Number(p.costo_total_paso) || 0), 0);

  const esPasoActual = (paso: Paso) => pasoActual?.id_paso === paso.id_paso;

  return (
    <>
      <Card className="noPrint">
        <CardHeader>
          <CardTitle className="text-lg">Flujo de Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando pasos...</p>
          ) : (
            <div className="space-y-3">
              {pasos.map((paso) => {
                const completado = paso.estado === "COMPLETADO";
                const enProceso = paso.estado === "EN_PROCESO";
                const pendiente = paso.estado === "PENDIENTE";
                const esActual = esPasoActual(paso);
                const esTueste = paso.servicios_maestro.tipo === "tueste";
                const esEmpacado = paso.servicios_maestro.tipo === "empacado";

                return (
                  <div
                    key={paso.id_paso}
                    className={`rounded-lg border p-4 ${enProceso ? "border-blue-400 bg-blue-50/50" : ""} ${
                      completado ? "border-green-200 bg-green-50/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                          {paso.prioridad}.
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{paso.servicios_maestro.nombre}</span>
                            {esTueste && <Flame className="h-4 w-4 text-amber-500 shrink-0" />}
                            {esEmpacado && <Package className="h-4 w-4 text-emerald-600 shrink-0" />}
                          </div>
                          <Badge className={estadoBadge(paso.estado)}>{estadosLabel[paso.estado]}</Badge>
                        </div>
                      </div>

                      {puedeEjecutar && esActual && (
                        <div className="shrink-0">
                          {pendiente && (
                            <Button size="sm" onClick={() => abrirDialog("iniciar", paso)}>
                              <Play className="h-4 w-4 mr-1" /> Iniciar
                            </Button>
                          )}
                          {enProceso && (
                            <div className="flex flex-wrap gap-2">
                              {esTueste ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={irAPerfilTueste} disabled={creandoPerfil}>
                                    <Thermometer className="h-4 w-4 mr-1" />
                                    {perfilTueste ? "Ir a perfil de tueste" : "Iniciar perfil de tueste"}
                                  </Button>
                                  <Button size="sm" onClick={() => abrirDialog("confirmar-tueste", paso)}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" onClick={() => abrirDialog("cerrar", paso)}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Completar
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {(completado || enProceso) && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Peso facturable</p>
                          <p className="font-medium">
                            {paso.peso_facturable_kg ?? paso.peso_inicial_kg != null ? `${Number(paso.peso_facturable_kg ?? paso.peso_inicial_kg)} kg` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Precio/kg</p>
                          <p className="font-medium">
                            {paso.snapshot_precio_kg != null ? `₡${Number(paso.snapshot_precio_kg).toLocaleString()}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Subtotal servicio</p>
                          <p className="font-medium">
                            {paso.subtotal_servicio != null ? `₡${Number(paso.subtotal_servicio).toLocaleString()}` : "—"}
                          </p>
                        </div>
                        {esTueste && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Peso final</p>
                              <p className="font-medium">{paso.peso_final_kg != null ? `${paso.peso_final_kg} kg` : "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Merma</p>
                              <p className="font-medium">{paso.merma_kg != null ? `${paso.merma_kg} kg` : "—"}</p>
                            </div>
                          </>
                        )}
                        {esEmpacado && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Empaques</p>
                              <p className="font-medium">
                                {paso.cantidad_empaques != null ? `${paso.cantidad_empaques} und` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Costo empaques</p>
                              <p className="font-medium">
                                {paso.costo_empaques != null ? `₡${Number(paso.costo_empaques).toLocaleString()}` : "—"}
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Total paso</p>
                          <p className="font-medium">
                            {paso.costo_total_paso != null ? `₡${Number(paso.costo_total_paso).toLocaleString()}` : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {pasos.some((p) => p.estado === "COMPLETADO") && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                  <span className="font-semibold">Total acumulado</span>
                  <span className="font-bold text-lg">₡{totalAcumulado.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAccion !== null} onOpenChange={(open) => !open && setDialogAccion(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAccion === "iniciar"
                ? `Iniciar: ${pasoActivo?.servicios_maestro.nombre}`
                : dialogAccion === "confirmar-tueste"
                  ? "Confirmar Tueste"
                  : esEmpacadoActivo
                    ? `Completar: ${pasoActivo?.servicios_maestro.nombre}`
                    : `Completar: ${pasoActivo?.servicios_maestro.nombre}`}
            </DialogTitle>
            <DialogDescription>
              {dialogAccion === "iniciar"
                ? "Registre el peso operativo del paso. Es la base para el cálculo del cobro."
                : dialogAccion === "confirmar-tueste"
                  ? "Registre el peso final del tueste para calcular la merma."
                  : esEmpacadoActivo
                    ? "Seleccione el empaque. Las unidades se calculan con el peso base del paso."
                    : "El cobro ya quedó calculado con el peso inicial. El peso final es opcional."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogAccion === "iniciar" && (
              <div className="space-y-2">
                <Label>
                  {esEmpacadoActivo ? "Peso base (kg) *" : "Peso inicial (kg) *"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pesoInput}
                  onChange={(e) => setPesoInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            )}

            {dialogAccion === "cerrar" && !esEmpacadoActivo && (
              <div className="space-y-2">
                <Label>Peso final (kg) — opcional</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pesoInput}
                  onChange={(e) => setPesoInput(e.target.value)}
                  placeholder="Dejar vacío si no aplica"
                />
              </div>
            )}

            {dialogAccion === "cerrar" && esEmpacadoActivo && (
              <div className="space-y-2">
                <Label>Empaque *</Label>
                <Select value={empaqueInput} onValueChange={(v) => v && setEmpaqueInput(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empaque..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empaques.map((e) => (
                      <SelectItem key={e.id_empaque} value={String(e.id_empaque)}>
                        {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Peso base: {pesoBaseEmpacado != null ? `${pesoBaseEmpacado} kg` : "—"}
                </p>
                {previewEmpacado && (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm">
                    <p className="font-medium text-emerald-800">
                      {previewEmpacado.cantidad} unidades · ₡{previewEmpacado.costoEmpaques.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {dialogAccion === "confirmar-tueste" && (
              <div className="space-y-2">
                <Label>Peso final (kg) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pesoInput}
                  onChange={(e) => setPesoInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            )}

            {(dialogAccion === "cerrar" || dialogAccion === "confirmar-tueste") && (
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Opcional..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogAccion(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={enviar} disabled={submitting}>
              {submitting ? "Procesando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
