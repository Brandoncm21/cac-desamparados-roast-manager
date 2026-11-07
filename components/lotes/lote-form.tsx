"use client";

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

export interface LoteActual {
  id_lote: number;
  nlote: string;
  nrecibo: number;
  nproductor: string;
  nfinca: string;
  zona: string | null;
  altura: number | null;
  robjetivo: number | null;
  rtotal: number | null;
  disponible: number | null;
  vendido: boolean;
  enproceso: string;
  semilavado: boolean;
  "natural": boolean;
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
          zona: lote.zona ?? "",
          otro: lote.otro ?? "",
          fecha_acopio: isoToLocalInput(lote.fecha_acopio) || "",
          altura: lote.altura ?? undefined,
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
          nproductor: "",
          nfinca: "",
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

  const onSubmit = async (values: CrearLoteInput) => {
    try {
      const { fecha_acopio, ...datos } = values;
      const payload: Record<string, unknown> = Object.fromEntries(
        Object.entries(datos).filter(([, v]) => v !== "" && v !== undefined)
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
          <CardTitle>Información Principal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nlote">N° de lote *</Label>
            <Input
              id="nlote"
              placeholder="Ej: LOTE-2024-001"
              disabled={editando} /* convención CBF: nlote no editable (disp. 1) */
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
            <Label htmlFor="nproductor">Productor *</Label>
            <Input id="nproductor" maxLength={100} {...register("nproductor", { required: true })} />
            {errors.nproductor && <p className="text-sm text-red-600">{String(errors.nproductor.message)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nfinca">Finca *</Label>
            <Input id="nfinca" maxLength={100} {...register("nfinca", { required: true })} />
            {errors.nfinca && <p className="text-sm text-red-600">{String(errors.nfinca.message)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zona">Zona</Label>
            <Input id="zona" maxLength={100} {...register("zona")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="altura">Altura (msnm)</Label>
            <Input id="altura" type="number" step="0.01" min={0} {...register("altura", { valueAsNumber: true })} />
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
          <CardTitle>Estado y Disponibilidad</CardTitle>
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
          <CardTitle>Tipo de Despulpado</CardTitle>
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
          <CardTitle>Pruebas Físicas y Densidad</CardTitle>
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
