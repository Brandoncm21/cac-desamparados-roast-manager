"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { guardarCatacionBodySchema, type GuardarCatacionBody } from "@/lib/schemas/catacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Perfil {
  public_id: string;
  id_perfil: number;
  id_orden: number | null;
  numero_lote: string | null;
  nombre_cafe: string | null;
}

/** Lote disponible para catar (nlote + finca + productor en el selector) */
interface Lote {
  id_lote: number;
  nlote: string;
  enproceso: string | null;
  clientes: { nombre_completo: string } | null;
  fincas: { nombre: string; altura: number | null } | null;
}

const SIN_LOTE = "__sin_lote__";

/** Respuesta de GET /api/cataciones/[id] (fila + rondas) */
type CatacionCargada = Record<string, unknown> & {
  rondas?: { id_catacion_ronda?: number | null; valor_calidad?: number | null }[];
};

/* Los 48 campos del snapshot CBF organizados por secciones */
const CAMPOS: Record<SeccionKey, { name: string; label: string; pct?: boolean }[]> = {
  fisico: [
    { name: "limpio", label: "Limpio (%)", pct: true },
    { name: "defectuoso", label: "Defectuoso (%)", pct: true },
    { name: "overde", label: "Olor en Verde", pct: true },
    { name: "ccverde", label: "Coloración en Verde", pct: true },
    { name: "quaker", label: "Quakers", pct: true },
    { name: "rtostado", label: "Rendimiento Tueste (%)", pct: true },
    { name: "dfueste", label: "Densidad Tueste (g/ml)" },
    { name: "cccalidad", label: "Catación Calidad", pct: true },
  ],
  c1: [
    { name: "c1agrio", label: "Agrio (%)", pct: true },
    { name: "c1hongos", label: "Hongos (%)", pct: true },
    { name: "c1cerezaseca", label: "Cereza Seca (%)", pct: true },
    { name: "c1negro", label: "Negro (%)", pct: true },
    { name: "c1insectos", label: "Insectos (%)", pct: true },
    { name: "c1me", label: "M.E.", pct: true },
  ],
  c2: [
    { name: "c2flotador", label: "Flotador (%)", pct: true },
    { name: "c2averanado", label: "Averanado (%)", pct: true },
    { name: "c2pergamino", label: "Pergamino (%)", pct: true },
    { name: "c2inmaduro", label: "Inmaduro (%)", pct: true },
    { name: "c2concha", label: "Concha (%)", pct: true },
    { name: "c2insectos", label: "Insectos (%)", pct: true },
    { name: "c2cascara", label: "Cáscara (%)", pct: true },
    { name: "c2pulpa", label: "Pulpa (%)", pct: true },
    { name: "c2partido", label: "Partido (%)", pct: true },
    { name: "c2cortado", label: "Cortado (%)", pct: true },
    { name: "c2mordido", label: "Mordido (%)", pct: true },
    { name: "c2negrop", label: "Negro Pergamino (%)", pct: true },
    { name: "c2agriop", label: "Agrio Pergamino (%)", pct: true },
  ],
  zarandas: [
    { name: "tres_sobre_dieciseis", label: "+16", pct: true },
    { name: "veinte", label: "20", pct: true },
    { name: "diecinueve", label: "19", pct: true },
    { name: "dieciocho", label: "18", pct: true },
    { name: "diecisiete", label: "17", pct: true },
    { name: "dieciseis", label: "16", pct: true },
    { name: "quince", label: "15", pct: true },
    { name: "catorce", label: "14", pct: true },
    { name: "trece", label: "13", pct: true },
  ],
  agtron: [
    { name: "tonagton_25", label: "25", pct: true },
    { name: "tonagton_35", label: "35", pct: true },
    { name: "tonagton_45", label: "45", pct: true },
    { name: "tonagton_55", label: "55", pct: true },
    { name: "tonagton_65", label: "65", pct: true },
    { name: "tonagton_75", label: "75", pct: true },
    { name: "tonagton_85", label: "85", pct: true },
    { name: "tonagton_95", label: "95", pct: true },
  ],
};

type SeccionKey = "fisico" | "c1" | "c2" | "zarandas" | "agtron";

type RondaForm = { id: number | null; valor_calidad: string | number | null };
/** El body que espera la API es { catacion: {...}, rondas: [...] } — se respeta anidado. */
type FormValues = {
  catacion: Partial<GuardarCatacionBody["catacion"]>;
  rondas: RondaForm[];
};

export function CatacionForm({ catacionId }: { catacionId?: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(guardarCatacionBodySchema as never),
    defaultValues: { rondas: [{ valor_calidad: null }], catacion: { finalizada: false } as never },
  });

  const { fields: rondasFields, append: appendRonda, remove: removeRonda } = useFieldArray({ control, name: "rondas" });

  useEffect(() => {
    supabase
      .from("perfiles_tueste")
      .select("public_id, id_perfil, id_orden, numero_lote, nombre_cafe")
      .eq("estado", "Completado")
      .is("deleted_at", null)
      .order("id_perfil", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("Error al cargar perfiles: " + error.message);
        else setPerfiles((data ?? []) as Perfil[]);
      });
  }, [supabase]);

  useEffect(() => {
    fetch("/api/lotes?pageSize=100&page=1")
      .then((r) => r.json())
      .then((result: { data?: Lote[] }) => setLotes(result.data ?? []))
      .catch(() => toast.error("No se pudieron cargar los lotes"));
  }, []);

  useEffect(() => {
    if (!catacionId) {
      setLoading(false);
      return;
    }
    fetch(`/api/cataciones/${catacionId}`)
      .then((r) => r.json())
      .then((result: { data?: CatacionCargada }) => {
        if (!result.data) return;
        const cargada = result.data;
        const rondas: RondaForm[] = (cargada.rondas ?? []).map((r) => ({
          id: r.id_catacion_ronda ?? null,
          valor_calidad: r.valor_calidad ?? null,
        }));
        reset({
          catacion: cargada as unknown as Partial<GuardarCatacionBody["catacion"]>,
          rondas: rondas.length > 0 ? rondas : [{ id: null, valor_calidad: null }],
        });
      })
      .catch(() => toast.error("No se pudo cargar la catación"))
      .finally(() => setLoading(false));
  }, [catacionId, reset]);

  const perfilRef = watch("catacion.perfil_tueste_ref");
  const perfilElegido = perfiles.find((p) => p.public_id === perfilRef);
  const loteId = watch("catacion.id_lote");
  const finalizada = watch("catacion.finalizada");
  const loteElegido = lotes.find((l) => l.id_lote === loteId);

  const seleccionarLote = (valor: string) => {
    if (valor === SIN_LOTE) {
      setValue("catacion.id_lote", null);
      setValue("catacion.nlote", null);
      return;
    }
    const id = Number(valor);
    const lote = lotes.find((l) => l.id_lote === id);
    setValue("catacion.id_lote", id);
    setValue("catacion.nlote", lote?.nlote ?? null);
  };

  const onSubmit = async (formData: FormValues) => {
    setSaving(true);
    try {
      const body = {
        catacion: formData.catacion,
        rondas: formData.rondas,
      };

      const res = await fetch(catacionId ? `/api/cataciones/${catacionId}` : "/api/cataciones", {
        method: catacionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = (await res.json()) as { error?: { message?: string } };

      if (!res.ok) {
        toast.error("Error al guardar catación: " + (result.error?.message || "Error desconocido"));
        return;
      }

      toast.success(catacionId ? "Catación actualizada" : "Catación registrada");
      router.push("/cataciones");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando catación…</div>;
  }

  const renderCampo = (campo: { name: string; label: string; pct?: boolean }) => (
    <div key={campo.name} className="space-y-1.5">
      <Label htmlFor={`f-${campo.name}`} className="text-xs">
        {campo.label}
      </Label>
      <Input
        id={`f-${campo.name}`}
        type="number"
        step="0.01"
        placeholder={campo.pct ? "0–100" : "0"}
        {...register(`catacion.${campo.name}` as never)}
      />
    </div>
  );

  return (
    <form id="catacion-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Sección 1: Perfil e2 + identidad */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil Cataado (e2) y Lote</CardTitle>
          <CardDescription>
            Elija un perfil de tueste Completado, un lote, o ambos. Con lote, el lote pasa a
            «En Catación» y a «Vendido» al marcarla finalizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Perfil de Tueste</Label>
            <Select
              value={perfilRef ?? undefined}
              onValueChange={(v) => setValue("catacion.perfil_tueste_ref", v ?? undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder={perfiles.length ? "Elija perfil Completado" : "Sin perfiles Completados"} />
              </SelectTrigger>
              <SelectContent>
                {perfiles.map((p) => (
                  <SelectItem key={p.public_id} value={p.public_id}>
                    {p.numero_lote || p.nombre_cafe || `Perfil #${p.id_perfil}`}
                    {p.id_orden ? ` — Orden #${p.id_orden}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {perfilElegido && (
              <p className="text-xs text-muted-foreground">
                Café: {perfilElegido.nombre_cafe || "-"} — Orden #{perfilElegido.id_orden ?? "-"}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Lote</Label>
            <Select
              value={loteId ? String(loteId) : SIN_LOTE}
              onValueChange={(v) => seleccionarLote(v ?? SIN_LOTE)}
            >
              <SelectTrigger>
                <SelectValue placeholder={lotes.length ? "Elija lote (N° · finca · productor)" : "Sin lotes registrados"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_LOTE}>— Sin lote (solo perfil) —</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id_lote} value={String(l.id_lote)}>
                    <span className="font-mono">{l.nlote}</span>
                    {" · "}
                    {l.fincas?.nombre ?? "sin finca"}
                    {" · "}
                    {l.clientes?.nombre_completo ?? "sin productor"}
                    {l.enproceso ? ` (${l.enproceso})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loteElegido && (
              <p className="text-xs text-muted-foreground">
                Finca: {loteElegido.fincas?.nombre ?? "-"}
                {loteElegido.fincas?.altura != null ? ` (${loteElegido.fincas.altura} msnm)` : ""}
                {" — Productor: "}
                {loteElegido.clientes?.nombre_completo ?? "-"}
                {loteElegido.enproceso ? ` — Estado actual: ${loteElegido.enproceso}` : ""}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-ffreposo">Fecha de Reposo</Label>
            <Input id="f-ffreposo" type="date" {...register("catacion.ffreposo" as never)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-pfinales">Puntaje Final (pfinales)</Label>
            <Input id="f-pfinales" type="number" step="0.01" placeholder="0–100" {...register("catacion.pfinales" as never)} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={Boolean(finalizada)}
                disabled={!loteId}
                onCheckedChange={(c) => setValue("catacion.finalizada", Boolean(c))}
                className="h-5 w-5"
              />
              <span>
                Catación finalizada — el lote pasa a <strong>Vendido</strong>
                {!loteId && (
                  <span className="text-muted-foreground"> (requiere un lote)</span>
                )}
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fisico" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="fisico">Físico-Visual</TabsTrigger>
          <TabsTrigger value="c1">Cat. 1</TabsTrigger>
          <TabsTrigger value="c2">Cat. 2</TabsTrigger>
          <TabsTrigger value="zarandas">Zarandas</TabsTrigger>
          <TabsTrigger value="agtron">Agtron</TabsTrigger>
          <TabsTrigger value="rondas">Rondas</TabsTrigger>
        </TabsList>

        <TabsContent value="fisico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluación Físico-Visual & Rendimientos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {CAMPOS.fisico.map(renderCampo)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="c1" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Defectos Categoría 1 (grano verde)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {CAMPOS.c1.map(renderCampo)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="c2" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Defectos Categoría 2 (grano verde)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {CAMPOS.c2.map(renderCampo)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zarandas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Zarandas (tamices 13–20)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {CAMPOS.zarandas.map(renderCampo)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agtron" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agtron (tonos 25–95)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CAMPOS.agtron.map(renderCampo)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rondas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Rondas de Catación</CardTitle>
              <CardDescription>
                Solo valor de calidad por ronda (decisión: 1 dato). El puntaje final se refleja en
                la sección principal (pfinales).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rondasFields.map((field, i) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Ronda {i + 1} — Valor Calidad (0–100)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 86.5"
                      {...register(`rondas.${i}.valor_calidad` as never)}
                    />
                  </div>
                  {rondasFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRonda(i)} aria-label="Quitar ronda">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendRonda({ valor_calidad: null, id: null })}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Ronda
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/cataciones")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || saving || (!perfilRef && !loteId)}>
          {saving ? "Guardando…" : catacionId ? "Actualizar Catación" : "Guardar Catación"}
        </Button>
      </div>
    </form>
  );
}
