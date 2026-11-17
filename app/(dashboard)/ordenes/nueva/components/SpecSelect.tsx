"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpecSelectProps {
  value: string;
  onChange: (valor: string) => void;
  options: string[];
  placeholder: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Select con opción "Otro" que despliega un campo de texto libre.
 *
 * La opción libre se marca con el centinela `__OTRO__` para no confundirla con
 * un valor real del catálogo.
 */
export function SpecSelect({
  value,
  onChange,
  options,
  placeholder,
  id,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: SpecSelectProps) {
  const [otro, setOtro] = useState(!options.includes(value) && value ? value : "");
  const isOtro = value === "__OTRO__" || (!options.includes(value) && !!value);

  return (
    <div className="space-y-2">
      <Select
        value={options.includes(value) ? value : value ? "__OTRO__" : ""}
        onValueChange={(v) => v && onChange(v)}
      >
        <SelectTrigger
          id={id}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
          className="h-12 md:h-10 text-base"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectItem value="__OTRO__" className="text-amber-600 font-medium">
            Otro
          </SelectItem>
        </SelectContent>
      </Select>
      {isOtro && (
        <Input
          id={id}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
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
