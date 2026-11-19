"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
};

export function PorcentajeInput({ className, value, onChange, ...props }: Props) {
  return (
    <div className="relative">
      <Input
        type="number"
        min={0}
        max={100}
        step="0.1"
        className={cn("pr-8", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
    </div>
  );
}
