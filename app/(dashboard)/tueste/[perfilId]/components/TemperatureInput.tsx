"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Thermometer } from "lucide-react";

const PASOS_RAPIDOS = [0.5, 1, 2] as const;

interface TemperatureInputProps {
  temperatura: string;
  setTemperatura: (value: string) => void;
  minutoManual: string;
  setMinutoManual: (value: string) => void;
  timeStep: number;
  setTimeStep: (step: number) => void;
  intervaloPersonalizado: string;
  setIntervaloPersonalizado: (value: string) => void;
  currentMinute: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onRegistrar: () => Promise<void>;
}

export function TemperatureInput({
  temperatura,
  setTemperatura,
  minutoManual,
  setMinutoManual,
  timeStep,
  setTimeStep,
  intervaloPersonalizado,
  setIntervaloPersonalizado,
  currentMinute,
  inputRef,
  onRegistrar,
}: TemperatureInputProps) {
  const cambiarIntervaloPersonalizado = (valor: string) => {
    setIntervaloPersonalizado(valor);
    const num = Number(valor);
    if (valor !== "" && Number.isFinite(num) && num > 0) {
      setTimeStep(num);
    }
  };

  return (
    <Card className="border-2 border-orange-200 bg-orange-50">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Label className="text-xs text-orange-800">Paso:</Label>
            {PASOS_RAPIDOS.map((paso) => (
              <Button
                key={paso}
                variant={timeStep === paso && intervaloPersonalizado === "" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => {
                  setIntervaloPersonalizado("");
                  setTimeStep(paso);
                }}
              >
                {paso} min
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Label htmlFor="intervalo-personalizado" className="text-xs text-orange-800">
              Intervalo:
            </Label>
            <Input
              id="intervalo-personalizado"
              type="number"
              min="0.5"
              step="0.5"
              value={intervaloPersonalizado}
              onChange={(e) => cambiarIntervaloPersonalizado(e.target.value)}
              className="h-7 w-24 text-xs text-center"
              placeholder="Ej: 3"
            />
            <span className="text-xs text-orange-800">min</span>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs text-orange-800">Minuto:</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={minutoManual}
              onChange={(e) => setMinutoManual(e.target.value)}
              className="h-7 w-20 text-xs text-center"
              placeholder="Auto"
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
          <div className="flex-1">
            <label className="text-sm font-medium text-orange-800 mb-1.5 block">
              Temperatura (°C) — Minuto {minutoManual || currentMinute}
            </label>
            <Input
              ref={inputRef}
              type="number"
              placeholder="Ej: 195"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRegistrar()}
              className="h-16 md:h-20 text-2xl md:text-4xl text-center font-bold"
              autoFocus
            />
          </div>
          <Button
            onClick={onRegistrar}
            className="h-16 md:h-20 w-full md:w-auto px-6 md:px-10 text-base md:text-lg font-bold shrink-0"
            size="lg"
          >
            <Thermometer className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Registrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
