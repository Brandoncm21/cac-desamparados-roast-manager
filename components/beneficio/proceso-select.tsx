"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROCESOS_BENEFICIO } from "@/lib/schemas/beneficio";

export function ProcesoSelect({
  value,
  onChange,
  procesoOtro,
  onProcesoOtroChange,
  error,
  errorOtro,
}: {
  value: string;
  onChange: (v: string) => void;
  procesoOtro: string;
  onProcesoOtroChange: (v: string) => void;
  error?: string;
  errorOtro?: string;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Proceso</Label>
        <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Sin definir" />
          </SelectTrigger>
          <SelectContent>
            {PROCESOS_BENEFICIO.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {value === "Otro" && (
        <div className="space-y-1.5">
          <Label htmlFor="proceso-otro">
            Especifique proceso <span className="text-destructive">*</span>
          </Label>
          <Input
            id="proceso-otro"
            value={procesoOtro}
            onChange={(e) => onProcesoOtroChange(e.target.value)}
            aria-invalid={Boolean(errorOtro)}
          />
          {errorOtro && <p className="text-xs text-destructive">{errorOtro}</p>}
        </div>
      )}
    </>
  );
}
