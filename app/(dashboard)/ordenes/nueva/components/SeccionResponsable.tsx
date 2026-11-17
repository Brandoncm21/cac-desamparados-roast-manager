"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { EmpleadoOption } from "../types";
import type { OrdenForm } from "../hooks/useOrdenFormulario";

interface SeccionResponsableProps {
  form: OrdenForm;
  empleados: EmpleadoOption[];
}

/** Empleado que recibe la orden. */
export function SeccionResponsable({ form, empleados }: SeccionResponsableProps) {
  const empleadoItems = empleados.map((e) => ({
    value: String(e.id_empleado),
    label: e.nombre,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Responsable</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <FormField
          control={form.control}
          name="id_empleado_recibe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsable *</FormLabel>
              <Select
                items={empleadoItems}
                onValueChange={(valor) => field.onChange(Number(valor))}
                value={field.value ? String(field.value) : ""}
              >
                <FormControl>
                  <SelectTrigger className="h-12 md:h-10 text-base">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Seleccionar...</SelectItem>
                  {empleados.map((empleado) => (
                    <SelectItem key={empleado.id_empleado} value={String(empleado.id_empleado)}>
                      {empleado.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
