"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ClienteAutocomplete } from "@/components/forms/cliente-autocomplete";
import { FincaSelect } from "@/components/fincas/finca-select";
import type { ClienteOption } from "../types";
import type { OrdenForm } from "../hooks/useOrdenFormulario";

interface SeccionClienteProps {
  form: OrdenForm;
  clientes: ClienteOption[];
}

/** Cliente y finca de la orden: el primer bloque del formulario. */
export function SeccionCliente({ form, clientes }: SeccionClienteProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Datos del Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <FormField
          control={form.control}
          name="id_cliente"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente *</FormLabel>
              <FormControl>
                <ClienteAutocomplete clientes={clientes} value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="id_finca"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FincaSelect
                  productorId={null}
                  permitirCrear={false}
                  value={field.value ?? null}
                  onChange={(finca) => field.onChange(finca?.id_finca ?? null)}
                  error={form.formState.errors.id_finca?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
