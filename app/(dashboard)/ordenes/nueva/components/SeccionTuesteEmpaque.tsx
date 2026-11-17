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
import { MOLIENDA_DEFAULT } from "@/lib/services/visibilidad";
import { OPCIONES_EMPAQUE, OPCIONES_MOLIENDA, OPCIONES_TUESTE } from "../constants";
import { SpecSelect } from "./SpecSelect";
import type { OrdenForm } from "../hooks/useOrdenFormulario";

interface SeccionTuesteEmpaqueProps {
  form: OrdenForm;
  hayTueste: boolean;
  hayMolido: boolean;
  hayEmpaque: boolean;
}

/** Especificaciones de tueste, molienda y empaque según los servicios contratados. */
export function SeccionTuesteEmpaque({
  form,
  hayTueste,
  hayMolido,
  hayEmpaque,
}: SeccionTuesteEmpaqueProps) {
  return (
    <>
      {hayTueste && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Especificaciones de Tueste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="tipo_tueste"
                render={({ field }) => (
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
                )}
              />
              <FormField
                control={form.control}
                name="tipo_molienda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de Molienda {hayMolido ? "*" : "(default)"}
                    </FormLabel>
                    <FormControl>
                      {hayMolido ? (
                        <SpecSelect
                          value={field.value || ""}
                          onChange={field.onChange}
                          options={OPCIONES_MOLIENDA}
                          placeholder="Seleccionar..."
                        />
                      ) : (
                        <Input
                          value={field.value || MOLIENDA_DEFAULT}
                          readOnly
                          disabled
                          className="h-12 md:h-10 text-base bg-muted"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    {!hayMolido && (
                      <p className="text-xs text-muted-foreground">
                        Por defecto {MOLIENDA_DEFAULT}. Solo se puede cambiar si contrata el
                        servicio Molido.
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {hayEmpaque && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Tipo de Empaque</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="tipo_empaque"
              render={({ field }) => (
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
              )}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
