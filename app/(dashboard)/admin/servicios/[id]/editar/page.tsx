"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  crearServicioSchema,
  TIPOS_SERVICIO,
  type CrearServicioInput,
} from "@/lib/schemas/servicios-maestro";
import { IntervalosEditor, type IntervaloForm } from "@/components/forms/intervalos-servicio-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IntervaloDB {
  id_precio: number;
  precio_por_kg: number;
  min_weight_kg: number;
  max_weight_kg: number | null;
  activo: boolean;
}

interface ServicioCompleto {
  id_servicio_maestro: number;
  nombre: string;
  descripcion: string | null;
  prioridad: number;
  tipo: string;
  activo: boolean;
  servicio_precios: IntervaloDB[];
}

const ETIQUETAS_TIPO: Record<string, string> = {
  general: "General",
  tueste: "Tueste (paso especial)",
  empacado: "Empacado (paso especial)",
};

export default function EditarServicioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [servicio, setServicio] = useState<ServicioCompleto | null>(null);

  const form = useForm<CrearServicioInput>({
    resolver: zodResolver(crearServicioSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      prioridad: undefined,
      tipo: "general",
      activo: true,
      intervalos: [],
    },
  });

  useEffect(() => {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      toast.error("ID de servicio invalido");
      router.push("/admin/servicios");
      return;
    }

    const load = async () => {
      const res = await fetch(`/api/admin/servicios/${id}`);
      const result = await res.json();
      if (!res.ok || !result.data) {
        toast.error("Servicio no encontrado");
        router.push("/admin/servicios");
        return;
      }

      const data = result.data as ServicioCompleto;
      setServicioId(data.id_servicio_maestro);
      setServicio(data);
      form.reset({
        nombre: data.nombre,
        descripcion: data.descripcion || "",
        prioridad: data.prioridad,
        tipo: data.tipo === "tueste" || data.tipo === "empacado" ? data.tipo : "general",
        activo: data.activo,
        intervalos: (data.servicio_precios || []).map((i) => ({
          id_precio: i.id_precio,
          peso_min_kg: Number(i.min_weight_kg),
          peso_max_kg: i.max_weight_kg != null ? Number(i.max_weight_kg) : null,
          precio_por_kg: Number(i.precio_por_kg),
        })),
      });
      setLoading(false);
    };
    load();
  }, [params.id, router, form]);

  const handleSubmit = async (values: CrearServicioInput) => {
    if (!servicioId) return;
    setSaving(true);
    try {
      const body = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        prioridad: values.prioridad,
        tipo: values.tipo,
        activo: values.activo,
        intervalos: (values.intervalos as IntervaloForm[]).map((i) => ({
          ...(i.id_precio ? { id_precio: i.id_precio } : {}),
          peso_min_kg: i.peso_min_kg,
          peso_max_kg: i.peso_max_kg,
          precio_por_kg: i.precio_por_kg,
        })),
      };

      const res = await fetch(`/api/admin/servicios/${servicioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (!res.ok) {
        const msg =
          result.error?.message ||
          result.error?.issues?.formErrors?.join(", ") ||
          "Error desconocido";
        toast.error("Error al actualizar: " + msg);
        return;
      }
      toast.success("Servicio actualizado");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">Cargando servicio...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Servicio</h1>
        <Badge variant={servicio?.activo ? "completado" : "cancelado"}>
          {servicio?.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del servicio *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Trillado, Chancado, Tueste" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prioridad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad (orden del proceso) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Numero unico que define la secuencia de pasos.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_SERVICIO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {ETIQUETAS_TIPO[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === "tueste"
                        ? "El paso de tueste requiere confirmacion manual del operador."
                        : field.value === "empacado"
                          ? "El paso de empacado solicita seleccion de empaque."
                          : "Servicio de proceso regular."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mb-0">Servicio activo</FormLabel>
                    <FormDescription>Desactivar lo oculta del selector de ordenes (soft delete).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Intervalos de precio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Precio por rango de peso: minimo inclusive, maximo exclusivo. Deje el maximo vacio para el ultimo tramo sin limite.
                  </p>
                  <Controller
                    control={form.control}
                    name="intervalos"
                    render={({ field }) => (
                      <IntervalosEditor value={field.value as IntervaloForm[]} onChange={field.onChange} />
                    )}
                  />
                  <FormMessage>{form.formState.errors.intervalos?.message}</FormMessage>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
