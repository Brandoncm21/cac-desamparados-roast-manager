"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearOrdenSchema, type CrearOrdenInput } from "@/lib/schemas/ordenes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const TIPOS_SERVICIO = [
  "Chancado", "Trillado", "Clasificación Mecánica", "Clasificación Manual",
  "Tueste", "Molido", "Empacado",
] as const;

interface ClienteOption {
  id_cliente: number;
  nombre_completo: string;
}

export default function NuevaOrdenPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [searchCliente, setSearchCliente] = useState("");

  const form = useForm<CrearOrdenInput>({
    resolver: zodResolver(crearOrdenSchema) as any,
    defaultValues: {
      num_talonario_fisico: "",
      id_cliente: 0 as any,
      descripcion_producto: "",
      proceso_cafe: "Otro",
      firma_aprobacion_cliente: false,
      servicios: [],
      tipo_tueste: "",
      tipo_molienda: "",
      tipo_empaque: "",
      observaciones: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "servicios" });

  useEffect(() => {
    const loadClientes = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id_cliente, nombre_completo")
        .ilike("nombre_completo", `%${searchCliente}%`)
        .order("nombre_completo")
        .limit(10);
      if (data) setClientes(data);
    };
    loadClientes();
  }, [searchCliente, supabase]);

  const toggleServicio = (tipo: typeof TIPOS_SERVICIO[number]) => {
    const idx = fields.findIndex((f) => f.tipo_servicio === tipo);
    if (idx >= 0) {
      remove(idx);
    } else {
      append({ tipo_servicio: tipo, peso_inicial: null as any, precio: null as any });
    }
  };

  const onSubmit = async (values: CrearOrdenInput) => {
    const { error } = await supabase.from("ordenes_trabajo").insert({
      num_talonario_fisico: values.num_talonario_fisico,
      id_cliente: Number(values.id_cliente),
      proceso_cafe: values.proceso_cafe,
      descripcion_producto: values.descripcion_producto,
      firma_aprobacion_cliente: values.firma_aprobacion_cliente,
      estado_orden: "Pendiente",
    });

    if (error) {
      toast.error("Error al crear orden: " + error.message);
      return;
    }

    toast.success("Orden creada exitosamente");
    router.push("/ordenes");
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pb-32 pt-12 lg:pt-0">
      <h1 className="text-xl md:text-2xl font-bold">Nueva Orden de Trabajo</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          {/* Cliente */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Datos del Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <FormField
                control={form.control}
                name="id_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-12 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <option value="">Seleccionar cliente...</option>
                        {clientes.map((c) => (
                          <option key={c.id_cliente} value={c.id_cliente}>{c.nombre_completo}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Input
                placeholder="Buscar cliente..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                className="h-12 md:h-10 text-base"
              />
            </CardContent>
          </Card>

          {/* Encabezado */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Encabezado de Orden</CardTitle></CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <FormField control={form.control} name="num_talonario_fisico" render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Talonario Físico</FormLabel>
                  <FormControl><Input {...field} className="h-12 md:h-10 text-base" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="proceso_cafe" render={({ field }) => (
                <FormItem>
                  <FormLabel>Proceso de Café</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 md:h-10 text-base"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Lavado">Lavado</SelectItem>
                      <SelectItem value="Honey">Honey</SelectItem>
                      <SelectItem value="Natural">Natural</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="descripcion_producto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Producto</FormLabel>
                  <FormControl><Input {...field} className="h-12 md:h-10 text-base" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Servicios */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Servicios</CardTitle></CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {TIPOS_SERVICIO.map((tipo) => {
                  const isSelected = fields.some((f) => f.tipo_servicio === tipo);
                  return (
                    <Button
                      key={tipo}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="justify-start h-14 md:h-12 text-sm md:text-sm"
                      onClick={() => toggleServicio(tipo)}
                    >
                      {isSelected ? "✓ " : "+ "}{tipo}
                    </Button>
                  );
                })}
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">{field.tipo_servicio}</Label>
                    <Input
                      type="number"
                      placeholder="Peso inicial (kg)"
                      className="mt-1 h-14 md:h-12 text-base"
                      {...form.register(`servicios.${index}.peso_inicial` as const, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Precio (₡)</Label>
                    <Input
                      type="number"
                      placeholder="₡ Precio"
                      className="mt-1 h-14 md:h-12 text-base"
                      {...form.register(`servicios.${index}.precio` as const, { valueAsNumber: true })}
                    />
                  </div>
                  <Button type="button" variant="ghost" className="self-end sm:self-auto h-14 md:h-12 w-full sm:w-auto" onClick={() => remove(index)}>
                    <Trash2 className="h-5 w-5 mr-2 sm:mr-0" /> <span className="sm:hidden">Eliminar</span>
                  </Button>
                </div>
              ))}
              <FormMessage />
            </CardContent>
          </Card>

          {/* Especificaciones */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Especificaciones</CardTitle></CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <FormField control={form.control} name="tipo_tueste" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Tueste</FormLabel>
                    <FormControl><Input {...field} className="h-12 md:h-10 text-base" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo_molienda" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Molienda</FormLabel>
                    <FormControl><Input {...field} className="h-12 md:h-10 text-base" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo_empaque" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Empaque</FormLabel>
                    <FormControl><Input {...field} className="h-12 md:h-10 text-base" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="observaciones" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl><Textarea {...field} className="text-base" rows={3} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Aprobación */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Aprobación</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="firma_aprobacion_cliente" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5" />
                  </FormControl>
                  <FormLabel className="mb-0 text-base">Firma de aprobación del cliente</FormLabel>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" className="flex-1 h-14 md:h-12 text-base md:text-lg font-bold">
              Crear Orden
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-14 md:h-12">
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
