"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { formatearColones } from "@/lib/format";
import { DialogoPaso } from "./pasos/DialogoPaso";
import { PasoCard } from "./pasos/PasoCard";
import { usePasosOrden } from "./pasos/usePasosOrden";

interface PasosPanelProps {
  idOrden: number;
  onImprimirFactura?: () => void;
  onDescargarFacturaPDF?: () => void;
}

/**
 * Flujo de proceso de una orden: qué paso toca, qué acciones admite y cuánto
 * suma lo completado.
 */
export function PasosPanel({
  idOrden,
  onImprimirFactura,
  onDescargarFacturaPDF,
}: PasosPanelProps) {
  const flujo = usePasosOrden(idOrden);
  const flujoCompletado =
    !flujo.loading && flujo.pasos.length > 0 && flujo.pasoActual === null;

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
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <span className="font-semibold">Total acumulado</span>
                    <span className="font-bold text-lg">
                      {formatearColones(flujo.totalAcumulado)}
                    </span>
                  </div>
                  {flujoCompletado && (onImprimirFactura || onDescargarFacturaPDF) && (
                    <div className="flex flex-wrap gap-2 noPrint">
                      {onImprimirFactura && (
                        <Button variant="outline" size="sm" onClick={onImprimirFactura}>
                          <Printer className="h-4 w-4 mr-2" />
                          Imprimir Factura
                        </Button>
                      )}
                      {onDescargarFacturaPDF && (
                        <Button size="sm" onClick={onDescargarFacturaPDF}>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </Button>
                      )}
                    </div>
                  )}
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
