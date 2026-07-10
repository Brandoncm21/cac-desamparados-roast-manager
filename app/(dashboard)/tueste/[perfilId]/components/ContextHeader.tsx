"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Save } from "lucide-react";
import type { Empleado, PerfilTueste } from "../types";

interface ContextHeaderProps {
  perfil: PerfilTueste | null;
  empleados: Empleado[];
  numeroFactura?: string;
  nombreTostador?: string;
  editContext: boolean;
  setEditContext: (edit: boolean) => void;
  ctxNombreCafe: string;
  setCtxNombreCafe: (value: string) => void;
  ctxIdTostador: string;
  setCtxIdTostador: (value: string) => void;
  ctxTempSala: string;
  setCtxTempSala: (value: string) => void;
  ctxHumSala: string;
  setCtxHumSala: (value: string) => void;
  onGuardar: () => Promise<void>;
}

export function ContextHeader({
  perfil,
  empleados,
  numeroFactura,
  nombreTostador,
  editContext,
  setEditContext,
  ctxNombreCafe,
  setCtxNombreCafe,
  ctxIdTostador,
  setCtxIdTostador,
  ctxTempSala,
  setCtxTempSala,
  ctxHumSala,
  setCtxHumSala,
  onGuardar,
}: ContextHeaderProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Contexto del Tueste</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditContext(!editContext)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {editContext ? "Cancelar" : "Editar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <p className="text-sm font-medium">{perfil?.fecha_tueste || "-"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nº Factura</Label>
            <p className="text-sm font-medium">{numeroFactura || "-"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tostador</Label>
            {editContext ? (
              <Select value={ctxIdTostador} onValueChange={(v) => setCtxIdTostador(v || "")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>
                      {e.nombre} ({e.rol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium">{nombreTostador || "-"}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Café</Label>
            {editContext ? (
              <Input
                value={ctxNombreCafe}
                onChange={(e) => setCtxNombreCafe(e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{ctxNombreCafe || "-"}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Temp. Sala (°C)</Label>
            {editContext ? (
              <Input
                type="number"
                value={ctxTempSala}
                onChange={(e) => setCtxTempSala(e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{ctxTempSala || "-"} °C</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Humedad Sala (%)</Label>
            {editContext ? (
              <Input
                type="number"
                value={ctxHumSala}
                onChange={(e) => setCtxHumSala(e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{ctxHumSala || "-"} %</p>
            )}
          </div>
        </div>
        {editContext && (
          <Button size="sm" className="mt-3" onClick={onGuardar}>
            <Save className="h-3.5 w-3.5 mr-1" /> Guardar Contexto
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
