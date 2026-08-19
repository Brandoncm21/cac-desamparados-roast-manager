"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface IntervaloForm {
  id_precio?: number;
  peso_min_kg: number | null;
  peso_max_kg: number | null;
  precio_por_kg: number | null;
}

interface IntervalosEditorProps {
  value: IntervaloForm[];
  onChange: (value: IntervaloForm[]) => void;
}

function hayTraslape(a: IntervaloForm, b: IntervaloForm): boolean {
  const aMin = a.peso_min_kg ?? 0;
  const aMax = a.peso_max_kg ?? Infinity;
  const bMin = b.peso_min_kg ?? 0;
  const bMax = b.peso_max_kg ?? Infinity;
  return (aMin < bMax && aMax > bMin) || (bMin < aMax && bMax > aMin);
}

export function IntervalosEditor({ value, onChange }: IntervalosEditorProps) {
  const actualizar = (index: number, campo: keyof IntervaloForm, raw: string) => {
    const nuevos = value.map((item, i) =>
      i === index ? { ...item, [campo]: raw === "" ? null : Number(raw) } : item
    );
    onChange(nuevos);
  };

  const agregar = () => {
    onChange([...value, { peso_min_kg: null, peso_max_kg: null, precio_por_kg: null }]);
  };

  const eliminar = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const errorDe = (intervalo: IntervaloForm, index: number): string | null => {
    if (intervalo.peso_min_kg == null || intervalo.precio_por_kg == null) {
      return null;
    }
    if (intervalo.peso_max_kg != null && intervalo.peso_min_kg >= intervalo.peso_max_kg) {
      return "El peso minimo debe ser menor que el maximo";
    }
    if (intervalo.precio_por_kg <= 0) {
      return "El precio por kg debe ser mayor a 0";
    }
    for (let i = 0; i < value.length; i++) {
      const otro = value[i];
      if (otro && i !== index && otro.peso_min_kg != null) {
        if (hayTraslape(intervalo, otro)) {
          return `Se traslapa con el intervalo ${i + 1}`;
        }
      }
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay intervalos. Agregue al menos uno para poder guardar el servicio.
        </p>
      )}

      {value.map((intervalo, index) => {
        const error = errorDe(intervalo, index);
        return (
          <div key={intervalo.id_precio ?? `nuevo-${index}`} className={`rounded-md border p-3 space-y-2 ${error ? "border-red-300" : ""}`}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Peso min (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={intervalo.peso_min_kg ?? ""}
                  onChange={(e) => actualizar(index, "peso_min_kg", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Peso max (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="sin limite"
                  value={intervalo.peso_max_kg ?? ""}
                  onChange={(e) => actualizar(index, "peso_max_kg", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Precio/kg (CRC)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={intervalo.precio_por_kg ?? ""}
                  onChange={(e) => actualizar(index, "precio_por_kg", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600">{error || "\u00A0"}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => eliminar(index)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={agregar}>
        <Plus className="h-4 w-4 mr-1" />
        Agregar intervalo
      </Button>
    </div>
  );
}
