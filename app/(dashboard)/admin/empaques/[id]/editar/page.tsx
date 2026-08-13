"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actualizarEmpaqueSchema, type ActualizarEmpaqueInput } from "@/lib/schemas/servicios-maestro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface PrecioEmpaque {
  id_precio: number;
  precio: number;
  valid_from: string;
  valid_to: string | null;
}

interface Empaque {
  id_empaque: number;
  nombre: string;
  unit_weight_kg: number | null;
  activo: boolean;
  empaque_precios: PrecioEmpaque[];
}

export default function EditarEmpaquePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empaqueId, setEmpaqueId] = useState<number | null>(null);
  const [precios, setPrecios] = useState<PrecioEmpaque[]>([]);
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  const form = useForm<ActualizarEmpaqueInput>({
    resolver: zodResolver(actualizarEmpaqueSchema),
    defaultValues: {
      nombre: "",
      unit_weight_kg: null,
    },
  });

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (Number.isNaN(id)) {
        toast.error("ID de empaque inválido");
        router.push("/admin/empaques");
        return;
      }

      const { data, error } = await supabase
        .from("empaques")
        .select(`
          *,
          empaque_precios(id_precio, precio, valid_from, valid_to)
        `)
        .eq("id_empaque", id)
        .single();

      if (error || !data) {
        toast.error("Empaque no encontrado");
        router.push("/admin/empaques");
        return;
      }

      const empaque = data as unknown as Empaque;
      setEmpaqueId(empaque.id_empaque);
      setPrecios((empaque.empaque_precios || []).sort(
        (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      ));
      form.reset({
        nombre: empaque.nombre,
        unit_weight_kg: empaque.unit_weight_kg,
      });
      setLoading(false);
    };
    load();
  }, [params.id, router, supabase, form]);

  const handleSubmit = async (values: ActualizarEmpaqueInput) => {
    if (!empaqueId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/empaques/${empaqueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error("Error al actualizar: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Empaque actualizado");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const agregarPrecio = async () => {
    if (!empaqueId) return;
    const valor = Number(nuevoPrecio);
    if (!nuevoPrecio || Number.isNaN(valor) || valor < 0) {
      toast.error("Ingrese un precio válido");
      return;
    }

    setGuardandoPrecio(true);
    try {
      const res = await fetch(`/api/admin/empaques/${empaqueId}/precios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio: valor }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error("Error al guardar precio: " + (result.error?.message || "Error desconocido"));
        return;
      }

      toast.success("Precio actualizado");
      setNuevoPrecio("");
      setPrecios((prev) => [
        { ...result.data, valid_to: null },
        ...prev.map((p) => ({ ...p, valid_to: p.valid_to ?? new Date().toISOString() })),
      ]);
    } finally {
      setGuardandoPrecio(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">Cargando empaque...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Empaque</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Empaque</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Precio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min={0}
              placeholder="Nuevo precio (₡)"
              value={nuevoPrecio}
              onChange={(e) => setNuevoPrecio(e.target.value)}
              disabled={guardandoPrecio}
            />
            <Button onClick={agregarPrecio} disabled={guardandoPrecio}>
              <Plus className="h-4 w-4 mr-2" />
              {guardandoPrecio ? "Guardando..." : "Actualizar precio"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Al actualizar el precio se cierra el anterior y se crea uno nuevo. Las órdenes existentes conservan sus snapshots.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Precio (₡)</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Hasta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {precios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">Sin precios registrados.</TableCell>
                </TableRow>
              )}
              {precios.map((p) => (
                <TableRow key={p.id_precio}>
                  <TableCell className="font-medium">₡{Number(p.precio).toLocaleString()}</TableCell>
                  <TableCell>{new Date(p.valid_from).toLocaleDateString()}</TableCell>
                  <TableCell>{p.valid_to ? new Date(p.valid_to).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.valid_to ? "outline" : "completado"}>
                      {p.valid_to ? "Histórico" : "Vigente"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
