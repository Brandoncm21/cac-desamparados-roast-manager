"use client";

import { CheckCircle2, Flame, Package, Play, Thermometer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { formatearColones, formatearPeso } from "@/lib/format";
import type { PasoOrden } from "@/lib/api/ordenes";

interface PasoCardProps {
  paso: PasoOrden;
  esActual: boolean;
  puedeEjecutar: boolean;
  tienePerfilTueste: boolean;
  creandoPerfil: boolean;
  onIniciar: () => void;
  onCompletar: () => void;
  onConfirmarTueste: () => void;
  onIrAPerfilTueste: () => void;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="font-medium">{valor}</p>
    </div>
  );
}

/** Fila de un paso: estado, acciones disponibles y sus cifras. */
export function PasoCard({
  paso,
  esActual,
  puedeEjecutar,
  tienePerfilTueste,
  creandoPerfil,
  onIniciar,
  onCompletar,
  onConfirmarTueste,
  onIrAPerfilTueste,
}: PasoCardProps) {
  const completado = paso.estado === "COMPLETADO";
  const enProceso = paso.estado === "EN_PROCESO";
  const pendiente = paso.estado === "PENDIENTE";
  const esTueste = paso.servicios_maestro.tipo === "tueste";
  const esEmpacado = paso.servicios_maestro.tipo === "empacado";

  return (
    <div
      className={`rounded-lg border p-4 ${enProceso ? "border-blue-400 bg-blue-50/50" : ""} ${
        completado ? "border-green-200 bg-green-50/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
            {paso.prioridad}.
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{paso.servicios_maestro.nombre}</span>
              {esTueste && <Flame className="h-4 w-4 text-amber-500 shrink-0" />}
              {esEmpacado && <Package className="h-4 w-4 text-emerald-600 shrink-0" />}
            </div>
            <EstadoBadge estado={paso.estado} familia="paso" />
          </div>
        </div>

        {puedeEjecutar && esActual && (
          <div className="shrink-0">
            {pendiente && (
              <Button size="sm" onClick={onIniciar}>
                <Play className="h-4 w-4 mr-1" /> Iniciar
              </Button>
            )}
            {enProceso && (
              <div className="flex flex-wrap gap-2">
                {esTueste ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onIrAPerfilTueste}
                      disabled={creandoPerfil}
                    >
                      <Thermometer className="h-4 w-4 mr-1" />
                      {tienePerfilTueste ? "Ir a perfil de tueste" : "Iniciar perfil de tueste"}
                    </Button>
                    <Button size="sm" onClick={onConfirmarTueste}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={onCompletar}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Completar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {(completado || enProceso) && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Dato
            etiqueta="Peso facturable"
            valor={formatearPeso(paso.peso_facturable_kg ?? paso.peso_inicial_kg)}
          />
          <Dato etiqueta="Precio/kg" valor={formatearColones(paso.snapshot_precio_kg)} />
          <Dato etiqueta="Subtotal servicio" valor={formatearColones(paso.subtotal_servicio)} />
          {esTueste && (
            <>
              <Dato etiqueta="Peso final" valor={formatearPeso(paso.peso_final_kg)} />
              <Dato etiqueta="Merma" valor={formatearPeso(paso.merma_kg)} />
            </>
          )}
          {esEmpacado && (
            <>
              <Dato
                etiqueta="Empaques"
                valor={paso.cantidad_empaques != null ? `${paso.cantidad_empaques} und` : "—"}
              />
              <Dato etiqueta="Costo empaques" valor={formatearColones(paso.costo_empaques)} />
            </>
          )}
          <Dato etiqueta="Total paso" valor={formatearColones(paso.costo_total_paso)} />
        </div>
      )}
    </div>
  );
}
