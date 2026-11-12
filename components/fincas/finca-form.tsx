"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  actualizarFinca, crearFinca, listarZonas, opcionesCliente, type FincaOpcion, type ZonaOpcion,
} from "@/lib/fincas";

const SIN_ZONA = "__sin_zona__";

const fincaFormSchema = z.object({
  cliente_id: z.number().int().positive("El productor es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  zona_id: z.number().int().positive().nullable().optional(),
  ubicacion: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  altura: z
    .preprocess(
      (v) => (v === "" || (typeof v === "number" && Number.isNaN(v)) ? null : v),
      z.number().min(0, "No puede ser negativa").max(4000, "Máximo 4000 msnm").nullable()
    )
    .optional(),
});

type FincaFormValues = z.infer<typeof fincaFormSchema>;

interface ClienteOpcion {
  id_cliente: number;
  nombre_completo: string;
}

interface FincaFormProps {
  /** Si viene, el formulario edita esa finca; si no, crea una nueva. */
  finca?: FincaOpcion | null;
  /** Sólo lectura del productor (la finca ya tiene lotes u órdenes asociadas). */
  clienteBloqueado?: boolean;
}

export function FincaForm({ finca, clienteBloqueado = false }: FincaFormProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [zonas, setZonas] = useState<ZonaOpcion[]>([]);
  const [nuevaZonaOpen, setNuevaZonaOpen] = useState(false);
  const [nuevaZonaNombre, setNuevaZonaNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FincaFormValues>({
    resolver: zodResolver(fincaFormSchema) as never,
    defaultValues: {
      cliente_id: finca?.cliente_id ?? (undefined as unknown as number),
      nombre: finca?.nombre ?? "",
      zona_id: finca?.zona_id ?? null,
      ubicacion: finca?.ubicacion ?? "",
      altura: finca?.altura ?? null,
    },
  });

  const clienteId = watch("cliente_id");
  const zonaId = watch("zona_id");

  useEffect(() => {
    let activo = true;
    fetch("/api/clientes?pageSize=100&page=1")
      .then((r) => r.json())
      .then((j) => {
        if (activo) setClientes(j.data ?? []);
      })
      .catch(() => toast.error("No se pudieron cargar los productores"));
    listarZonas()
      .then((z) => {
        if (activo) setZonas(z);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  const crearZona = async () => {
    const nombre = nuevaZonaNombre.trim();
    if (!nombre) {
      toast.error("El nombre de la zona es obligatorio");
      return;
    }
    const res = await fetch("/api/zonas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const cuerpo = (await res.json().catch(() => ({}))) as {
      data?: ZonaOpcion;
      error?: { message?: string };
    };
    if (!res.ok || !cuerpo.data) {
      toast.error("Error al crear la zona: " + (cuerpo.error?.message ?? "Error desconocido"));
      return;
    }
    setZonas((prev) => [...prev, cuerpo.data as ZonaOpcion].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setValue("zona_id", cuerpo.data.id_zona);
    setNuevaZonaNombre("");
    setNuevaZonaOpen(false);
    toast.success("Zona creada");
  };

  const onSubmit = async (values: FincaFormValues) => {
    setSaving(true);
    try {
      const payload = {
        cliente_id: values.cliente_id,
        nombre: values.nombre.trim(),
        zona_id: values.zona_id ?? null,
        ubicacion: values.ubicacion?.trim() || null,
        altura: values.altura ?? null,
      };
      const guardada = finca
        ? await actualizarFinca(finca.id_finca, payload)
        : await crearFinca(payload);
      toast.success(finca ? "Finca actualizada" : "Finca creada");
      router.push(`/fincas/${guardada.id_finca ?? finca?.id_finca}`);
      router.refresh();
    } catch (e) {
      toast.error((finca ? "Error al actualizar: " : "Error al crear: ") + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos de la finca</CardTitle>
          <CardDescription>
            El productor es el dueño de la finca; la zona es del catálogo y la altura alimenta
            automáticamente los lotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Productor (cliente) *</Label>
            <Select
              items={opcionesCliente(clientes)}
              value={clienteId ? String(clienteId) : null}
              onValueChange={(v) => setValue("cliente_id", Number(v ?? 0), { shouldValidate: true })}
              disabled={clienteBloqueado}
            >
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
            {clienteBloqueado && (
              <p className="text-xs text-muted-foreground">
                No se puede cambiar el productor: la finca ya tiene lotes u órdenes asociadas.
              </p>
            )}
            {errors.cliente_id && <p className="text-sm text-red-600">{String(errors.cliente_id.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la finca *</Label>
            <Input id="nombre" maxLength={150} placeholder="Ej: Finca La Esperanza" {...register("nombre")} />
            {errors.nombre && <p className="text-sm text-red-600">{String(errors.nombre.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="altura">Altura (msnm)</Label>
            <Input
              id="altura"
              type="number"
              min={0}
              step="0.01"
              placeholder="Opcional (ej: 1200)"
              {...register("altura", { valueAsNumber: true })}
            />
            {errors.altura && <p className="text-sm text-red-600">{String(errors.altura.message)}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Zona</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setNuevaZonaOpen((v) => !v)}
              >
                + Nueva zona
              </Button>
            </div>
            <Select
              items={[
                { value: SIN_ZONA, label: "Sin zona" },
                ...zonas.map((z) => ({ value: String(z.id_zona), label: z.nombre })),
              ]}
              value={zonaId != null ? String(zonaId) : SIN_ZONA}
              onValueChange={(v) => setValue("zona_id", v && v !== SIN_ZONA ? Number(v) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_ZONA}>Sin zona</SelectItem>
                {zonas.map((z) => (
                  <SelectItem key={z.id_zona} value={String(z.id_zona)}>
                    {z.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nuevaZonaOpen && (
              <div className="flex items-end gap-2">
                <Input
                  placeholder="Nombre de la zona"
                  value={nuevaZonaNombre}
                  maxLength={100}
                  onChange={(e) => setNuevaZonaNombre(e.target.value)}
                />
                <Button type="button" size="sm" onClick={crearZona}>
                  Crear
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación / referencia</Label>
            <Input
              id="ubicacion"
              maxLength={200}
              placeholder="Ej: 2 km al norte de la plaza, San Marcos"
              {...register("ubicacion")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/fincas")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : finca ? "Guardar cambios" : "Crear finca"}
        </Button>
      </div>
    </form>
  );
}
