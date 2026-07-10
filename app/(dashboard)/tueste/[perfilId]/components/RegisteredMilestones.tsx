"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, CloudOff } from "lucide-react";
import type { HitoRecord } from "../types";

interface RegisteredMilestonesProps {
  hitos: HitoRecord[];
}

export function RegisteredMilestones({ hitos }: RegisteredMilestonesProps) {
  if (hitos.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <h3 className="text-sm font-medium mb-2">Hitos Registrados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hitos.map((h) => (
            <div
              key={h.tipo_hito}
              className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg min-h-[48px]"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <span className="font-medium text-sm">{h.tipo_hito}:</span>
              <span className="text-sm">
                {h.tiempo_min} min / {h.temperatura}°C
              </span>
              {!h.synced && <CloudOff className="h-4 w-4 text-amber-500 ml-auto shrink-0" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
