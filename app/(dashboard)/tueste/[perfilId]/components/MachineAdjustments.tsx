"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import type { AjusteLocal } from "../types";

interface MachineAdjustmentsProps {
  ajustes: AjusteLocal[];
  setAjustes: React.Dispatch<React.SetStateAction<AjusteLocal[]>>;
  ajustesOpen: boolean;
  setAjustesOpen: (open: boolean) => void;
  onAgregar: () => void;
  onEliminar: (index: number) => void;
  onGuardar: (ajuste: AjusteLocal, index: number) => Promise<void>;
}

export function MachineAdjustments({
  ajustes,
  setAjustes,
  ajustesOpen,
  setAjustesOpen,
  onAgregar,
  onEliminar,
  onGuardar,
}: MachineAdjustmentsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setAjustesOpen(!ajustesOpen)}
          type="button"
        >
          <CardTitle className="text-sm font-medium">Ajustes durante el Tueste</CardTitle>
          {ajustesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>
      {ajustesOpen && (
        <CardContent>
          <div className="space-y-2">
            {ajustes.length > 0 && (
              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground mb-1">
                <span>Minuto</span>
                <span>Temp (°C)</span>
                <span>Llama</span>
                <span>Aire</span>
                <span></span>
              </div>
            )}
            {ajustes.map((ajuste, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 items-center">
                <Input
                  type="number"
                  step="0.5"
                  value={ajuste.tiempo}
                  onChange={(e) => {
                    setAjustes((prev) =>
                      prev.map((a, i) => (i === index ? { ...a, tiempo: e.target.value } : a))
                    );
                  }}
                  className="h-8 text-sm text-center"
                  placeholder="0"
                />
                <Input
                  type="number"
                  value={ajuste.temperatura_ajuste}
                  onChange={(e) => {
                    setAjustes((prev) =>
                      prev.map((a, i) =>
                        i === index ? { ...a, temperatura_ajuste: e.target.value } : a
                      )
                    );
                  }}
                  className="h-8 text-sm text-center"
                  placeholder="°C"
                />
                <Input
                  value={ajuste.llama}
                  onChange={(e) => {
                    setAjustes((prev) =>
                      prev.map((a, i) => (i === index ? { ...a, llama: e.target.value } : a))
                    );
                  }}
                  className="h-8 text-sm text-center"
                  placeholder="%"
                />
                <Input
                  value={ajuste.aire}
                  onChange={(e) => {
                    setAjustes((prev) =>
                      prev.map((a, i) => (i === index ? { ...a, aire: e.target.value } : a))
                    );
                  }}
                  className="h-8 text-sm text-center"
                  placeholder="%"
                />
                <div className="flex gap-1">
                  {ajuste._isNew !== false && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onGuardar(ajuste, index)}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500"
                    onClick={() => onEliminar(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={onAgregar} className="w-full mt-2">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Ajuste
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
