"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Flag, Pencil, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { HITOS_RAPIDOS, type HitoEditData, type HitoRecord } from "../types";

interface QuickMilestonesProps {
  hitos: HitoRecord[];
  editHitosOpen: boolean;
  setEditHitosOpen: (open: boolean) => void;
  editHitosData: Record<string, HitoEditData>;
  setEditHitosData: React.Dispatch<React.SetStateAction<Record<string, HitoEditData>>>;
  onRegistrarHito: (tipoHito: string) => Promise<void>;
  onGuardarHitos: () => Promise<void>;
}

export function QuickMilestones({
  hitos,
  editHitosOpen,
  setEditHitosOpen,
  editHitosData,
  setEditHitosData,
  onRegistrarHito,
  onGuardarHitos,
}: QuickMilestonesProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Hitos Rápidos</h3>
        <Dialog open={editHitosOpen} onOpenChange={setEditHitosOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar Hitos
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Hitos</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {HITOS_RAPIDOS.map((hito) => (
                <div key={hito} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-sm font-medium">{hito}</span>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Tiempo (min)"
                    value={editHitosData[hito]?.tiempo_min || ""}
                    onChange={(e) =>
                      setEditHitosData((prev) => ({
                        ...prev,
                        [hito]: {
                          tiempo_min: e.target.value,
                          temperatura: prev[hito]?.temperatura || "",
                        },
                      }))
                    }
                    className="h-8 text-sm text-center"
                  />
                  <Input
                    type="number"
                    placeholder="Temp (°C)"
                    value={editHitosData[hito]?.temperatura || ""}
                    onChange={(e) =>
                      setEditHitosData((prev) => ({
                        ...prev,
                        [hito]: {
                          tiempo_min: prev[hito]?.tiempo_min || "",
                          temperatura: e.target.value,
                        },
                      }))
                    }
                    className="h-8 text-sm text-center"
                  />
                </div>
              ))}
              <Button onClick={onGuardarHitos} className="w-full">
                <Save className="h-4 w-4 mr-1" /> Guardar Hitos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {HITOS_RAPIDOS.map((hito) => {
          const isRegistered = hitos.some((h) => h.tipo_hito === hito);
          return (
            <Button
              key={hito}
              variant={isRegistered ? "default" : "outline"}
              className={cn(
                "h-14 md:h-16 text-xs md:text-sm whitespace-normal",
                isRegistered && "bg-green-600 hover:bg-green-700"
              )}
              onClick={() => onRegistrarHito(hito)}
              disabled={isRegistered}
            >
              <Flag className="h-4 w-4 mr-1 shrink-0" />
              <span className="leading-tight">{hito}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
