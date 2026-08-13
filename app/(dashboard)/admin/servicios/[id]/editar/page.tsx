"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actualizarServicioMaestroSchema, type ActualizarServicioMaestroInput } from "@/lib/schemas/servicios-maestro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface PrecioServicio {
  id_precio: number;
  precio_por_kg: number;
  valid_from: string;
  valid_to: string | null;
}

interface ServicioMaestro {
  id_servicio_maestro: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  default_peso_kg: number | null;
  activo: boolean;
  servicio_precios: PrecioServicio[];
}

export default function EditarServicioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [precios, setPrecios] = useState<PrecioServicio[]>([]);
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  const form = useForm<ActualizarServicioMaestroInput>({
    resolver: zodResolver(actualizarServicioMaestroSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      descripcion: "",
      default_peso_kg: null,
    },
  });

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (Number.isNaN(id)) {
        toast.error("ID de servicio inválido");
        router.push("/admin/servicios");
        return;
      }

      const { data, error } = await supabase
        .from("servicios_maestro")
        .select(`
          *,
          servicio_precios(id_precio, precio_por_kg, valid_from, valid_to)
        `)
        .eq("id_servicio_maestro", id)
        .single();

      if (error || !data) {
        toast.error("Servicio no encontrado");
        router.push("/admin/servicios");
        return;
      }

      const servicio = data as unknown as ServicioMaestro;
      setServicioId(servicio.id_servicio_maestro);
      setPrecios((servicio.servicio_precios || []).sort(
        (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      ));
      form.reset({
        codigo: servicio.codigo,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion || "",
        default_peso_kg: servicio.default_peso_kg,
      });
      setLoading(false);
    };
    load();
  }, [params.id, router, supabase, form]);

  const handleSubmit = async (values: ActualizarServicioMaestroInput) => {
    if (!servicioId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/servicios/${servicioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error("Error al actualizar: " + (result.error?.message || "Error desconocido"));
        return;
      }
      toast.success("Servicio actualizado");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const agregarPrecio = async () => {
    if (!servicioId) return;
    const valor = Number(nuevoPrecio);
    if (!nuevoPrecio || Number.isNaN(valor) || valor < 0) {
      toast.error("Ingrese un precio válido");
      return;
    }

    setGuardandoPrecio(true);
    try {
      const res = await fetch(`/api/admin/servicios/${servicioId}/precios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio_por_kg: valor }),
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

  const desactivar = async () => {
    if (!servicioId) return;
    if (!window.confirm("¿Desactivar este servicio? Los datos históricos se preservan.")) return;
    const { error } = await supabase
      .from("servicios_maestro")
      .update({ activo: false })
      .eq("id_servicio_maestro", servicioId);
    if (error) {
      toast.error("Error al desactivar: " + error.message);
      return;
    }
    toast.success("Servicio desactivado");
    router.push("/admin/servicios");
    router.refresh();
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-mono" />
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
                <Button type="button" variant="destructive" onClick={desactivar} disabled={saving}>
                  Desactivar
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
          <CardTitle className="text-lg">Precio por kg</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min={0}
              placeholder="Nuevo precio por kg (₡)"
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
                <TableHead>Precio (₡/kg)</TableHead>
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
                  <TableCell className="font-medium">₡{Number(p.precio_por_kg).toLocaleString()}</TableCell>
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
