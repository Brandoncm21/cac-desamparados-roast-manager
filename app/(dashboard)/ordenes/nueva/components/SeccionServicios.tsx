"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServicioActivo } from "@/lib/api/servicios";
import type { CampoListaServicio } from "../types";
import type { OrdenForm } from "../hooks/useOrdenFormulario";

interface SeccionServiciosProps {
  form: OrdenForm;
  fields: CampoListaServicio[];
  serviciosActivos: ServicioActivo[];
  idsSeleccionados: Set<number>;
  onAgregar: (idServicio: number) => void;
  onQuitar: (indice: number) => void;
}

/** Servicios contratados y selector para añadir más. */
export function SeccionServicios({
  form,
  fields,
  serviciosActivos,
  idsSeleccionados,
  onAgregar,
  onQuitar,
}: SeccionServiciosProps) {
  const disponibles = serviciosActivos.filter((s) => !idsSeleccionados.has(s.id_servicio_maestro));
  const servicioItems = serviciosActivos.map((s) => ({
    value: String(s.id_servicio_maestro),
    label: s.nombre,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Servicios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50"
              >
                <span className="font-medium">{field.tipo_servicio}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onQuitar(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Select
          items={servicioItems}
          onValueChange={(valor) => {
            const id = Number(valor);
            if (id) onAgregar(id);
          }}
        >
          <SelectTrigger className="h-14 md:h-12 text-base">
            <Plus className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Agregar servicio..." />
          </SelectTrigger>
          <SelectContent>
            {disponibles.map((servicio) => (
              <SelectItem
                key={servicio.id_servicio_maestro}
                value={String(servicio.id_servicio_maestro)}
              >
                {servicio.nombre}
              </SelectItem>
            ))}
            {disponibles.length === 0 && (
              <SelectItem value="__none__" disabled>
                No hay más servicios disponibles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <FormMessage>{form.formState.errors.servicios?.message}</FormMessage>
      </CardContent>
    </Card>
  );
}
