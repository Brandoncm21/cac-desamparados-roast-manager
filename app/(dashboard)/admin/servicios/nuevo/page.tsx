"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NuevoServicioPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (values: CrearServicioInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        const msg = result.error?.message || result.error?.issues?.formErrors?.join(", ") || "Error desconocido";
        toast.error("Error al crear servicio: " + msg);
        return;
      }
      toast.success("Servicio creado exitosamente");
      router.push("/admin/servicios");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const etiquetasTipo: Record<string, string> = {
    general: "General",
    tueste: "Tueste (paso especial)",
    empacado: "Empacado (paso especial)",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Servicio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                          placeholder="Ej: 1"
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
                            {etiquetasTipo[t]}
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
                      <Textarea rows={3} placeholder="Descripción del servicio (opcional)..." {...field} value={field.value ?? ""} />
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
                    El precio se aplica por rango de peso: minimo inclusive, maximo exclusivo. Deje el maximo vacio para el ultimo tramo sin limite.
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
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Guardar servicio"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
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
