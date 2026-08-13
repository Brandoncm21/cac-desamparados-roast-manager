"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearEmpaqueSchema, type CrearEmpaqueInput } from "@/lib/schemas/servicios-maestro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NuevoEmpaquePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CrearEmpaqueInput>({
    resolver: zodResolver(crearEmpaqueSchema),
    defaultValues: {
      nombre: "",
      unit_weight_kg: null,
    },
  });

  const onSubmit = async (values: CrearEmpaqueInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/empaques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error("Error al crear empaque: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Empaque creado exitosamente");
      router.push("/admin/empaques");
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
        <h1 className="text-2xl font-bold">Nuevo Empaque</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Empaque</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Bolsa con válvula 1Kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso unitario (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Ej: 1"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
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
                    "Crear Empaque"
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
