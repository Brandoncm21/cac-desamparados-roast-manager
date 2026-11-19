"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
  unidad: string;
  tipo?: "number" | "text";
};

export function InputConUnidad({
  className,
  value,
  onChange,
  unidad,
  tipo = "number",
  ...props
}: Props) {
  return (
    <div className="relative">
      <Input
        type={tipo}
        className={cn("pr-14", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {unidad}
      </span>
    </div>
  );
}
