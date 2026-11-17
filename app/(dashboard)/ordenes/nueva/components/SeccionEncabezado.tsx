"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPCIONES_PROCESO } from "../constants";
import type { OrdenForm } from "../hooks/useOrdenFormulario";

interface SeccionEncabezadoProps {
  form: OrdenForm;
}

/** Datos de cabecera de la orden: proceso, producto y observaciones. */
export function SeccionEncabezado({ form }: SeccionEncabezadoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Encabezado de Orden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <FormField
          control={form.control}
          name="proceso_cafe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proceso de Café</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger className="h-12 md:h-10 text-base">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Sin especificar</SelectItem>
                  {OPCIONES_PROCESO.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="descripcion_producto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción del Producto</FormLabel>
              <FormControl>
                <Input {...field} className="h-12 md:h-10 text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea {...field} className="text-base" rows={3} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

interface SeccionAprobacionProps {
  form: OrdenForm;
}

/** Firma de aprobación del cliente. */
export function SeccionAprobacion({ form }: SeccionAprobacionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Aprobación</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="firma_aprobacion_cliente"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="h-5 w-5"
                />
              </FormControl>
              <FormLabel className="mb-0 text-base">Firma de aprobación del cliente</FormLabel>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
