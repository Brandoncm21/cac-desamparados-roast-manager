"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearOrdenSchema, type CrearOrdenInput } from "@/lib/schemas/ordenes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteAutocomplete } from "@/components/forms/cliente-autocomplete";
import { InlineAddSelect } from "@/components/forms/inline-add-select";
import { calcularLineaTotal } from "@/lib/calculo-precios";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const TIPOS_SERVICIO = [
  "Chancado", "Trillado", "Clasificación Mecánica", "Clasificación Manual",
  "Tueste", "Molido", "Empacado",
] as const;

const OPCIONES_TUESTE = ["Claro", "Medio", "Oscuro"];
const OPCIONES_MOLIENDA = ["Fina", "Media", "Gruesa", "Grano Entero"];
const OPCIONES_EMPAQUE = [
  "Bolsa con válvula 500g",
  "Bolsa con válvula 1Kg",
  "Bolsa 5Kg",
  "Saco 46Kg",
  "A granel",
];
const OPCIONES_PROCESO = ["Lavado", "Honey", "Natural", "Otro"];

interface ClienteOption {
  id_cliente: number;
  nombre_completo: string;
}

interface EmpleadoOption {
  id_empleado: number;
  nombre: string;
}

interface ZonaOption {
  id_zona: number;
  nombre: string;
}

interface ServicioActivo {
  id_servicio_maestro: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  default_peso_kg: number | null;
  precio_por_kg: number | null;
}

interface EmpaqueActivo {
  id_empaque: number;
  nombre: string;
  unit_weight_kg: number | null;
  precio: number | null;
}

function SpecSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}) {
  const [otro, setOtro] = useState(!options.includes(value) && value ? value : "");
  const isOtro = value === "__OTRO__" || (!options.includes(value) && !!value);

  return (
    <div className="space-y-2">
      <Select value={options.includes(value) ? value : value ? "__OTRO__" : ""} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="h-12 md:h-10 text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
          <SelectItem value="__OTRO__" className="text-amber-600 font-medium">Otro</SelectItem>
        </SelectContent>
      </Select>
      {isOtro && (
        <Input
          value={otro}
          onChange={(e) => {
            setOtro(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Especificar..."
          className="h-12 md:h-10 text-base"
          autoFocus
        />
      )}
    </div>
  );
}

export default function NuevaOrdenPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [zonas, setZonas] = useState<ZonaOption[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [serviciosActivos, setServiciosActivos] = useState<ServicioActivo[]>([]);
  const [empaquesActivos, setEmpaquesActivos] = useState<EmpaqueActivo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(crearOrdenSchema),
    defaultValues: {
      id_cliente: 0,
      zona_finca: "",
      descripcion_producto: "",
      proceso_cafe: "",
      porcentaje_humedad_entrada: null,
      firma_aprobacion_cliente: false,
      servicios: [],
      tipo_tueste: "",
      tipo_molienda: "",
      tipo_empaque: "",
      observaciones: "",
      id_empleado_recibe: undefined,
    },
  });

  const { setValue, watch } = form;

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "servicios" });

  useEffect(() => {
    const load = async () => {
      const [{ data: cli }, { data: zon }, { data: emp }, resServicios] = await Promise.all([
        supabase.from("clientes").select("id_cliente, nombre_completo").order("nombre_completo"),
        supabase.from("zonas_finca").select("id_zona, nombre").order("nombre"),
        supabase.from("empleados").select("id_empleado, nombre").eq("activo", true).order("nombre"),
        fetch("/api/servicios-activos"),
      ]);
      if (cli) setClientes(cli);
      if (zon) setZonas(zon);
      if (emp) setEmpleados(emp);

      if (resServicios.ok) {
        const { data } = await resServicios.json();
        setServiciosActivos(data?.servicios || []);
        setEmpaquesActivos(data?.empaques || []);
      }
    };
    load();
  }, [supabase]);

  const addServicio = (servicioId: number) => {
    const servicio = serviciosActivos.find((s) => s.id_servicio_maestro === servicioId);
    if (!servicio) return;
    append({
      tipo_servicio: servicio.nombre,
      servicio_id: servicio.id_servicio_maestro,
      empaque_id: null,
      peso_inicial: servicio.default_peso_kg ?? (null as any),
      precio: servicio.precio_por_kg ?? (null as any),
      override_precio: false,
      override_motivo: null,
    } as any);
  };

  const removeServicio = (index: number) => {
    remove(index);
  };

  const calcularLineaTotalRow = (s: CrearOrdenInput["servicios"][number]) => {
    const empaque = empaquesActivos.find((e) => e.id_empaque === s.empaque_id);
    return calcularLineaTotal({
      pesoKg: s.peso_inicial,
      precioPorKg: s.precio,
      precioEmpaque: empaque?.precio,
    });
  };

  const serviciosWatch = watch("servicios") as CrearOrdenInput["servicios"];
  const totalGeneral = serviciosWatch.reduce((sum, s) => sum + calcularLineaTotalRow(s), 0);

  const [pendingValues, setPendingValues] = useState<CrearOrdenInput | null>(null);

  const onSubmit = (values: CrearOrdenInput) => {
    if (!values.id_cliente || values.id_cliente <= 0) {
      form.setError("id_cliente", { message: "Debe seleccionar un cliente" });
      toast.error("Debe seleccionar un cliente");
      return;
    }

    if (values.servicios.length === 0) {
      form.setError("servicios", { message: "Agregue al menos un servicio" });
      toast.error("Debe agregar al menos un servicio");
      return;
    }

    if (!values.id_empleado_recibe) {
      form.setError("id_empleado_recibe", { message: "Debe seleccionar un responsable" });
      toast.error("Debe seleccionar un responsable");
      return;
    }

    setPendingValues(values);
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    if (!pendingValues) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingValues),
      });

      const result = await res.json();

      if (!res.ok) {
        const flattenedIssues = result.error?.issues;
        const fieldErrors = flattenedIssues?.fieldErrors || {};
        const messages = Object.values(fieldErrors).flat() as string[];
        const errorMessage = messages.length > 0
          ? messages.join(", ")
          : (flattenedIssues?.formErrors?.join(", ") || result.error?.message || "Error desconocido");

        Object.entries(fieldErrors).forEach(([key, value]) => {
          const msg = Array.isArray(value) ? value.join(", ") : String(value);
          if (msg) form.setError(key as any, { message: msg });
        });

        toast.error("Error al crear orden: " + errorMessage);
        setConfirmOpen(false);
        return;
      }

      toast.success("Orden creada exitosamente");
      setConfirmOpen(false);
      router.push("/ordenes");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const agregarZona = async (nombre: string) => {
    const res = await fetch("/api/zonas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) throw new Error("No se pudo guardar la zona");
    const result = await res.json();
    setZonas((prev) => [...prev, result.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return result.data.nombre;
  };

  const zonaOptions = zonas.map((z) => ({ value: z.nombre, label: z.nombre }));

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
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      <ClienteAutocomplete
                        clientes={clientes}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zona_finca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona o Finca</FormLabel>
                    <FormControl>
                      <InlineAddSelect
                        options={zonaOptions}
                        value={field.value || ""}
                        onChange={field.onChange}
                        onAdd={agregarZona}
                        placeholder="Seleccionar zona o finca..."
                        addLabel="Agregar nueva zona..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Encabezado */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Encabezado de Orden</CardTitle></CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <FormField control={form.control} name="proceso_cafe" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proceso de Café</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="h-12 md:h-10 text-base"><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin especificar</SelectItem>
                        {OPCIONES_PROCESO.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="porcentaje_humedad_entrada" render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Humedad</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        placeholder="Ej: 12.5"
                        className="h-12 md:h-10 text-base"
                        value={(field.value as number | null | undefined) ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
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
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {fields.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Empaque</TableHead>
                      <TableHead>Peso inicial (kg)</TableHead>
                      <TableHead>Precio/kg (₡)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.tipo_servicio}</TableCell>
                        <TableCell>
                          <Select
                            value={field.empaque_id ? String(field.empaque_id) : ""}
                            onValueChange={(v) => {
                              const empaqueId = Number(v);
                              setValue(`servicios.${index}.empaque_id`, empaqueId || null);
                            }}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Sin empaque" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sin empaque</SelectItem>
                              {empaquesActivos.map((e) => (
                                <SelectItem key={e.id_empaque} value={String(e.id_empaque)}>
                                  {e.nombre}{e.precio ? ` (₡${Number(e.precio).toLocaleString()})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-10 text-sm"
                            {...form.register(`servicios.${index}.peso_inicial` as const, { valueAsNumber: true })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="1"
                              placeholder="0"
                              className="h-10 text-sm"
                              disabled={!form.watch(`servicios.${index}.override_precio`)}
                              {...form.register(`servicios.${index}.precio` as const, { valueAsNumber: true })}
                            />
                            {form.watch(`servicios.${index}.override_precio`) ? (
                              <Input
                                placeholder="Motivo de modificación..."
                                className="h-8 text-xs"
                                {...form.register(`servicios.${index}.override_motivo`)}
                              />
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-amber-600 hover:text-amber-700"
                                onClick={() => {
                                  setValue(`servicios.${index}.override_precio`, true);
                                }}
                              >
                                Modificar precio
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₡{calcularLineaTotalRow(form.watch(`servicios.${index}`) as CrearOrdenInput["servicios"][number]).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeServicio(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="font-bold text-right">Total General</TableCell>
                      <TableCell className="text-right font-bold">₡{totalGeneral.toLocaleString()}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              <Select
                onValueChange={(v) => {
                  const val = String(v);
                  if (val.startsWith("legacy:")) {
                    append({ tipo_servicio: val.replace("legacy:", ""), servicio_id: null, empaque_id: null, peso_inicial: null as any, precio: null as any, override_precio: false, override_motivo: null } as any);
                    return;
                  }
                  const id = Number(val);
                  if (id) addServicio(id);
                }}
              >
                <SelectTrigger className="h-14 md:h-12 text-base">
                  <Plus className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Agregar servicio..." />
                </SelectTrigger>
                <SelectContent>
                  {serviciosActivos.length > 0 ? (
                    serviciosActivos.map((s) => (
                      <SelectItem key={s.id_servicio_maestro} value={String(s.id_servicio_maestro)}>
                        {s.nombre}{s.precio_por_kg ? ` (₡${Number(s.precio_por_kg).toLocaleString()}/kg)` : " (sin precio)"}
                      </SelectItem>
                    ))
                  ) : (
                    TIPOS_SERVICIO.map((tipo) => (
                      <SelectItem key={tipo} value={`legacy:${tipo}`}>{tipo}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage>{form.formState.errors.servicios?.message}</FormMessage>
            </CardContent>
          </Card>

          {/* Responsable */}
          <Card>
            <CardHeader><CardTitle className="text-base md:text-lg">Responsable</CardTitle></CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <FormField control={form.control} name="id_empleado_recibe" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl>
                      <SelectTrigger className="h-12 md:h-10 text-base"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Seleccionar...</SelectItem>
                      {empleados.map((e) => (
                        <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
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
                    <FormControl>
                      <SpecSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        options={OPCIONES_TUESTE}
                        placeholder="Seleccionar..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo_molienda" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Molienda</FormLabel>
                    <FormControl>
                      <SpecSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        options={OPCIONES_MOLIENDA}
                        placeholder="Seleccionar..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo_empaque" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Empaque</FormLabel>
                    <FormControl>
                      <SpecSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        options={OPCIONES_EMPAQUE}
                        placeholder="Seleccionar..."
                      />
                    </FormControl>
                    <FormMessage />
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
            <Button type="submit" className="flex-1 h-14 md:h-12 text-base md:text-lg font-bold" disabled={submitting}>
              {submitting ? "Creando..." : "Crear Orden"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-14 md:h-12">
              Cancelar
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar creación de orden</DialogTitle>
            <DialogDescription>
              Revise los datos esenciales antes de continuar.
            </DialogDescription>
          </DialogHeader>

          {pendingValues && (
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-amber-700">Datos esenciales</p>
                <p><span className="text-muted-foreground">Cliente:</span> {clientes.find((c) => c.id_cliente === pendingValues.id_cliente)?.nombre_completo || "No seleccionado"}</p>
                <p><span className="text-muted-foreground">Responsable:</span> {empleados.find((e) => e.id_empleado === pendingValues.id_empleado_recibe)?.nombre || "No seleccionado"}</p>
                <p><span className="text-muted-foreground">Servicios:</span> {pendingValues.servicios.map((s) => s.tipo_servicio).join(", ")}</p>
              </div>

              {(() => {
                const vacios: string[] = [];
                if (!pendingValues.zona_finca) vacios.push("Zona o Finca");
                if (!pendingValues.proceso_cafe) vacios.push("Proceso de café");
                if (!pendingValues.descripcion_producto) vacios.push("Descripción del producto");
                if (!pendingValues.tipo_tueste) vacios.push("Tipo de tueste");
                if (!pendingValues.tipo_molienda) vacios.push("Tipo de molienda");
                if (!pendingValues.tipo_empaque) vacios.push("Tipo de empaque");
                if (!pendingValues.observaciones) vacios.push("Observaciones");

                if (vacios.length === 0) return null;
                return (
                  <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                    <p className="font-medium text-amber-800 mb-1">Campos opcionales sin completar</p>
                    <p className="text-amber-700">{vacios.join(", ")}</p>
                    <p className="text-xs text-amber-600 mt-1">Estos datos pueden completarse más tarde desde la edición de la orden.</p>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} className="w-full sm:w-auto">
              Revisar formulario
            </Button>
            <Button type="button" onClick={confirmSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Creando..." : "Confirmar creación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
