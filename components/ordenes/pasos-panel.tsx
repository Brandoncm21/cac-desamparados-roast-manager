"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearColones } from "@/lib/format";
import { DialogoPaso } from "./pasos/DialogoPaso";
import { PasoCard } from "./pasos/PasoCard";
import { usePasosOrden } from "./pasos/usePasosOrden";

/**
 * Flujo de proceso de una orden: qué paso toca, qué acciones admite y cuánto
 * suma lo completado.
 */
export function PasosPanel({ idOrden }: { idOrden: number }) {
  const flujo = usePasosOrden(idOrden);

  if (flujo.pasos.length === 0 && !flujo.loading) return null;

  return (
    <>
      <Card className="noPrint">
        <CardHeader>
          <CardTitle className="text-lg">Flujo de Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          {flujo.loading ? (
            <p className="text-sm text-muted-foreground">Cargando pasos...</p>
          ) : (
            <div className="space-y-3">
              {flujo.pasos.map((paso) => (
                <PasoCard
                  key={paso.id_paso}
                  paso={paso}
                  esActual={flujo.pasoActual?.id_paso === paso.id_paso}
                  puedeEjecutar={flujo.puedeEjecutar}
                  tienePerfilTueste={Boolean(flujo.perfilTueste)}
                  creandoPerfil={flujo.creandoPerfil}
                  onIniciar={() => flujo.abrirDialogo("iniciar", paso)}
                  onCompletar={() => flujo.abrirDialogo("cerrar", paso)}
                  onConfirmarTueste={() => flujo.abrirDialogo("confirmar-tueste", paso)}
                  onIrAPerfilTueste={flujo.irAPerfilTueste}
                />
              ))}

              {flujo.pasos.some((p) => p.estado === "COMPLETADO") && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                  <span className="font-semibold">Total acumulado</span>
                  <span className="font-bold text-lg">
                    {formatearColones(flujo.totalAcumulado)}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {flujo.accion && flujo.pasoActivo && (
        <DialogoPaso
          accion={flujo.accion}
          nombrePaso={flujo.pasoActivo.servicios_maestro.nombre}
          esEmpacado={flujo.esEmpacadoActivo}
          empaques={flujo.empaques}
          pesoBaseEmpacado={flujo.pesoBaseEmpacado}
          enviando={flujo.enviando}
          onCancelar={flujo.cerrarDialogo}
          onConfirmar={flujo.confirmarEnvio}
        />
      )}
    </>
  );
}
