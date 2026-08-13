"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearServicioMaestroSchema, type CrearServicioMaestroInput } from "@/lib/schemas/servicios-maestro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NuevoServicioPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CrearServicioMaestroInput>({
    resolver: zodResolver(crearServicioMaestroSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      descripcion: "",
      default_peso_kg: null,
    },
  });

  const onSubmit = async (values: CrearServicioMaestroInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error("Error al crear servicio: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Servicio creado exitosamente");
      router.push("/admin/servicios");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: TUESTE-MED" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_peso_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso default (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Ej: 50"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Tueste Medio" {...field} />
                    </FormControl>
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
                      <Textarea rows={3} placeholder="Descripción del servicio..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Servicio"
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
