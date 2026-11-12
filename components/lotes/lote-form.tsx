"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  crearLoteSchema,
  actualizarLoteSchema,
  ENPROCESO_LOTE,
  type CrearLoteInput,
  type ActualizarLoteInput,
} from "@/lib/schemas/lotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ClienteOpcion {
  id_cliente: number;
  nombre_completo: string;
}

interface FincaOpcion {
  id_finca: number;
  nombre: string;
  altura: number;
  cliente_id: number;
}

export interface LoteActual {
  id_lote: number;
  nlote: string;
  nrecibo: number;
  id_cliente: number;
  id_finca: number;
  robjetivo: number | null;
  rtotal: number | null;
  disponible: number | null;
  vendido: boolean;
  enproceso: string;
  proceso_cafe: string | null;
  semilavado: boolean;
  natural: boolean;
  anaerobico: boolean;
  miel: boolean;
  lavado: boolean;
  otro: string | null;
  pf_pulpa_pergamino: number | null;
  pf_dmecanicos: number | null;
  pf_segundas: number | null;
  pf_pergamino_pulpa: number | null;
  pdensidad_fruta: number | null;
  pdensidad_pergamino_humedo: number | null;
  fecha_acopio: string | null;
}

const DESPULPADO: Array<[keyof ActualizarLoteInput, string]> = [
  ["lavado", "Lavado"],
  ["miel", "Miel"],
  ["semilavado", "Semilavado"],
  ["anaerobico", "Anaeróbico"],
  ["natural", "Natural"],
];

const PRUEBAS: Array<[keyof ActualizarLoteInput, string]> = [
  ["pf_pulpa_pergamino", "Pulpa/Pergamino (%)"],
  ["pf_dmecanicos", "Daños mecánicos (%)"],
  ["pf_segundas", "Segundas (%)"],
  ["pf_pergamino_pulpa", "Pergamino/Pulpa (%)"],
  ["pdensidad_fruta", "Densidad de fruta"],
  ["pdensidad_pergamino_humedo", "Densidad pergamino húmedo"],
];

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LoteForm({ lote }: { lote?: LoteActual }) {
  const router = useRouter();
  const editando = Boolean(lote);

  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [fincas, setFincas] = useState<FincaOpcion[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(lote?.id_cliente ?? null);
  const [fincaId, setFincaId] = useState<number | null>(lote?.id_finca ?? null);
  const [nuevaFincaOpen, setNuevaFincaOpen] = useState(false);
  const [nuevaFincaNombre, setNuevaFincaNombre] = useState("");
  const [nuevaFincaAltura, setNuevaFincaAltura] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CrearLoteInput>({
    resolver: zodResolver(
      editando ? (actualizarLoteSchema as unknown as typeof crearLoteSchema) : crearLoteSchema
    ) as never,
    defaultValues: lote
      ? {
          ...lote,
          nlote: "",
          id_cliente: lote.id_cliente,
          id_finca: lote.id_finca,
          otro: lote.otro ?? "",
          fecha_acopio: isoToLocalInput(lote.fecha_acopio) || "",
          robjetivo: lote.robjetivo ?? undefined,
          rtotal: lote.rtotal ?? undefined,
          disponible: lote.disponible ?? undefined,
          pf_pulpa_pergamino: lote.pf_pulpa_pergamino ?? undefined,
          pf_dmecanicos: lote.pf_dmecanicos ?? undefined,
          pf_segundas: lote.pf_segundas ?? undefined,
          pf_pergamino_pulpa: lote.pf_pergamino_pulpa ?? undefined,
          pdensidad_fruta: lote.pdensidad_fruta ?? undefined,
          pdensidad_pergamino_humedo: lote.pdensidad_pergamino_humedo ?? undefined,
        } as unknown as CrearLoteInput
      : {
          nrecibo: undefined as unknown as number,
          nlote: "",
          id_cliente: undefined as unknown as number,
          id_finca: undefined as unknown as number,
          vendido: false,
          enproceso: "No",
          semilavado: false,
          "natural": false,
          anaerobico: false,
          miel: false,
          lavado: false,
        },
  });

  const enprocesoActual = watch("enproceso") ?? "No";
  const fincaSeleccionada = fincas.find((f) => f.id_finca === fincaId) ?? null;

  // Clientes (productores) para el combobox.
  useEffect(() => {
    let activo = true;
    fetch("/api/clientes?pageSize=100&page=1")
      .then((r) => r.json())
      .then((j) => {
        if (activo) setClientes(j.data ?? []);
      })
      .catch(() => toast.error("No se pudieron cargar los clientes"));
    return () => {
      activo = false;
    };
  }, []);

  // Fincas del cliente seleccionado.
  useEffect(() => {
    if (!clienteId) {
      setFincas([]);
      return;
    }
    let activo = true;
    fetch(`/api/fincas?cliente_id=${clienteId}&pageSize=100&page=1`)
      .then((r) => r.json())
      .then((j) => {
        if (!activo) return;
        const lista: FincaOpcion[] = j.data ?? [];
        setFincas(lista);
        // Si la finca actual no pertenece al cliente, limpiar.
        if (fincaId && !lista.some((f) => f.id_finca === fincaId)) {
          setFincaId(null);
          setValue("id_finca", undefined as unknown as number);
        }
      })
      .catch(() => toast.error("No se pudieron cargar las fincas"));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const onClienteChange = (value: string | null) => {
    if (!value) return;
    const id = Number(value);
    setClienteId(id);
    setValue("id_cliente", id, { shouldValidate: true });
    setFincaId(null);
    setValue("id_finca", undefined as unknown as number);
  };

  const onFincaChange = (value: string | null) => {
    if (!value) return;
    const id = Number(value);
    setFincaId(id);
    setValue("id_finca", id, { shouldValidate: true });
  };

  const crearFinca = async () => {
    if (!clienteId) {
      toast.error("Seleccioná un productor primero");
      return;
    }
    const altura = Number(nuevaFincaAltura);
    if (!nuevaFincaNombre.trim()) {
      toast.error("El nombre de la finca es obligatorio");
      return;
    }
    if (!Number.isFinite(altura) || altura < 0) {
      toast.error("La altura (msnm) es obligatoria");
      return;
    }
    const res = await fetch("/api/fincas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: clienteId, nombre: nuevaFincaNombre.trim(), altura }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error("Error al crear finca: " + (result.error?.message || "Error desconocido"));
      return;
    }
    toast.success("Finca creada");
    setNuevaFincaOpen(false);
    setNuevaFincaNombre("");
    setNuevaFincaAltura("");
    const nueva = result.data as FincaOpcion;
    setFincas((prev) => [...prev, nueva]);
    onFincaChange(String(nueva.id_finca));
  };

  const onSubmit = async (values: CrearLoteInput) => {
    try {
      const { fecha_acopio, ...datos } = values;
      const payload: Record<string, unknown> = Object.fromEntries(
        Object.entries(datos).filter(([, v]) => v !== "" && v !== undefined && v !== null)
      );
      if (fecha_acopio) payload["fecha_acopio"] = fecha_acopio;

      const res = await fetch(lote ? `/api/lotes/${lote.id_lote}` : "/api/lotes", {
        method: lote ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(
          (lote ? "Error al actualizar: " : "Error al crear: ") +
            (result.error?.message || "Error desconocido")
        );
        return;
      }
      toast.success(lote ? "Lote actualizado exitosamente" : "Lote creado exitosamente");
      router.push(`/lotes/${lote ? lote.id_lote : result.data.id_lote}`);
    } catch {
      toast.error("Error de red");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información Principal del Lote Raíz</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nlote">N° de lote *</Label>
            <Input
              id="nlote"
              placeholder="Ej: LOTE-2024-001"
              disabled={editando}
              {...register("nlote", { required: !editando })}
            />
            {errors.nlote && <p className="text-sm text-red-600">{String(errors.nlote.message)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nrecibo">N° de recibo *</Label>
            <Input id="nrecibo" type="number" min={0} {...register("nrecibo", { valueAsNumber: true })} />
            {errors.nrecibo && <p className="text-sm text-red-600">{String(errors.nrecibo.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label>Productor (cliente) *</Label>
            <Select value={clienteId ? String(clienteId) : ""} onValueChange={onClienteChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar productor" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id_cliente} value={String(c.id_cliente)}>
                    {c.nombre_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_cliente && <p className="text-sm text-red-600">{String(errors.id_cliente.message)}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Finca *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={!clienteId}
                onClick={() => setNuevaFincaOpen((v) => !v)}
              >
                + Crear finca
              </Button>
            </div>
            <Select
              value={fincaId ? String(fincaId) : ""}
              onValueChange={onFincaChange}
              disabled={!clienteId || fincas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={clienteId ? "Seleccionar finca" : "Elegí un productor primero"} />
              </SelectTrigger>
              <SelectContent>
                {fincas.map((f) => (
                  <SelectItem key={f.id_finca} value={String(f.id_finca)}>
                    {f.nombre} — {f.altura} msnm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_finca && <p className="text-sm text-red-600">{String(errors.id_finca.message)}</p>}
          </div>

          {nuevaFincaOpen && (
            <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="nf-nombre">Nombre de la finca *</Label>
                <Input
                  id="nf-nombre"
                  value={nuevaFincaNombre}
                  onChange={(e) => setNuevaFincaNombre(e.target.value)}
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nf-altura">Altura (msnm) *</Label>
                <Input
                  id="nf-altura"
                  type="number"
                  min={0}
                  step="0.01"
                  value={nuevaFincaAltura}
                  onChange={(e) => setNuevaFincaAltura(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" size="sm" onClick={crearFinca}>Crear finca</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setNuevaFincaOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Altura (msnm)</Label>
            <Input value={fincaSeleccionada ? `${fincaSeleccionada.altura}` : ""} readOnly placeholder="Se completa desde la finca" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_acopio">Fecha/Hora de acopio</Label>
            <Input id="fecha_acopio" type="datetime-local" {...register("fecha_acopio")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rango de Maduración</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="robjetivo">Rango objetivo (%)</Label>
            <Input id="robjetivo" type="number" step="0.01" min={0} {...register("robjetivo", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rtotal">Rango total (%)</Label>
            <Input id="rtotal" type="number" step="0.01" min={0} {...register("rtotal", { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado y Disponibilidad en Planta</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Estado del proceso</Label>
            <Select
              value={enprocesoActual}
              onValueChange={(v) => setValue("enproceso", v as CrearLoteInput["enproceso"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {ENPROCESO_LOTE.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="disponible">Cantidad disponible (kg)</Label>
            <Input id="disponible" type="number" step="0.01" min={0} {...register("disponible", { valueAsNumber: true })} />
          </div>
          <div className="flex items-center gap-2 self-end pb-2 min-h-[40px]">
            <Checkbox
              id="vendido"
              defaultChecked={Boolean(lote?.vendido)}
              onCheckedChange={(c) => setValue("vendido", Boolean(c))}
            />
            <Label htmlFor="vendido" className="font-normal">Vendido</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipo de Beneficio y Despulpado</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DESPULPADO.map(([campo, etiqueta]) => (
            <div key={campo} className="flex items-center gap-2 min-h-[40px]">
              <Checkbox
                id={`desp-${campo}`}
                defaultChecked={Boolean(editando && lote && lote[campo as keyof LoteActual])}
                onCheckedChange={(c) => setValue(campo as "lavado", Boolean(c) as never)}
              />
              <Label htmlFor={`desp-${campo}`} className="font-normal">{etiqueta}</Label>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3 space-y-2">
            <Label htmlFor="otro">Otro (especificar)</Label>
            <Input id="otro" maxLength={100} {...register("otro")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pruebas Físicas en Húmedo &amp; Análisis de Densidad</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRUEBAS.map(([campo, etiqueta]) => (
            <div key={campo} className="space-y-2">
              <Label htmlFor={campo}>{etiqueta}</Label>
              <Input id={campo} type="number" step="0.01" min={0} {...register(campo as "pf_segundas", { valueAsNumber: true })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href={lote ? `/lotes/${lote.id_lote}` : "/lotes"}>
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {lote ? "Guardar cambios" : "Crear lote"}
        </Button>
      </div>
    </form>
  );
}
