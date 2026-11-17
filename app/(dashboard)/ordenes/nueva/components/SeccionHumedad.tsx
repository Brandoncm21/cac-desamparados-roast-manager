"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { OrdenForm } from "../hooks/useOrdenFormulario";

interface SeccionHumedadProps {
  form: OrdenForm;
}

/** Humedad de entrada: solo aplica a tueste y secado. */
export function SeccionHumedad({ form }: SeccionHumedadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Humedad de Entrada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <FormField
          control={form.control}
          name="porcentaje_humedad_entrada"
          render={({ field }) => (
            <FormItem>
              <FormLabel>% Humedad Inicial</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="Ej: 12.5"
                  className="h-12 md:h-10 text-base"
                  value={(field.value as number | null | undefined) ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Con cuánta humedad entra el café al proceso (relevante para tueste y secado).
        </p>
      </CardContent>
    </Card>
  );
}
