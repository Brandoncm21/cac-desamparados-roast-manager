"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ContextHeader } from "./components/ContextHeader";
import { RendimientosTable } from "./components/RendimientosTable";
import { TemperatureInput } from "./components/TemperatureInput";
import { QuickMilestones } from "./components/QuickMilestones";
import { LiveChart } from "./components/LiveChart";
import { MachineAdjustments } from "./components/MachineAdjustments";
import { RegisteredMilestones } from "./components/RegisteredMilestones";
import { Summary } from "./components/Summary";
import { TuesteHeader } from "./components/TuesteHeader";
import { FinalizeButton } from "./components/FinalizeButton";
import { useAdjustments } from "./hooks/useAdjustments";
import { useContexto } from "./hooks/useContexto";
import { useFinalizacion } from "./hooks/useFinalizacion";
import { useMetrics } from "./hooks/useMetrics";
import { useMilestones } from "./hooks/useMilestones";
import { useMobileDetection } from "./hooks/useMobileDetection";
import { usePDF } from "./hooks/usePDF";
import { useSyncStatus } from "./hooks/useSyncStatus";
import { useTemperatures } from "./hooks/useTemperatures";
import { useTuesteData } from "./hooks/useTuesteData";

export default function CapturaTuestePage() {
  const params = useParams<{ perfilId: string }>();
  const router = useRouter();
  const perfilId = Number(params.perfilId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [timeStep, setTimeStep] = useState<1 | 0.5>(1);

  if (!Number.isFinite(perfilId) || perfilId <= 0) {
    toast.error("Perfil de tueste inválido");
    router.push("/tueste");
    return null;
  }

  const isOnline = useSyncStatus();
  const isMobile = useMobileDetection();

  const {
    empleados,
    perfil,
    metricas: initialMetricas,
    ajustes: initialAjustes,
    puntos: initialPuntos,
    hitos: initialHitos,
    currentMinute: initialCurrentMinute,
    isLoading,
  } = useTuesteData(perfilId, timeStep);

  const {
    temperatura,
    setTemperatura,
    minutoManual,
    setMinutoManual,
    puntos,
    currentMinute,
    registrarTemperatura,
  } = useTemperatures({
    perfilId,
    isOnline,
    timeStep,
    initialPuntos,
    initialCurrentMinute,
  });

  const {
    hitos,
    editHitosOpen,
    setEditHitosOpen,
    editHitosData,
    setEditHitosData,
    registrarHito,
    guardarTodosHitos,
  } = useMilestones({
    perfilId,
    isOnline,
    currentMinute,
    temperaturaInput: temperatura,
    puntos,
    initialHitos,
  });

  const { metricas, setMetricas, guardarMetrica, calcularDiferencia } = useMetrics({
    perfilId,
    initialMetricas,
  });

  const {
    ajustes,
    setAjustes,
    ajustesOpen,
    setAjustesOpen,
    agregarAjuste,
    eliminarAjuste,
    guardarAjuste,
  } = useAdjustments({
    perfilId,
    initialAjustes,
  });

  const {
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
    guardarContexto,
  } = useContexto({ perfilId, perfil });

  const { showResumen, resumen, finalizarTueste } = useFinalizacion({ perfilId });

  const { chartRef, descargarPDF } = usePDF({
    perfilId,
    perfil,
    metricas,
    hitos,
    ajustes,
    ctxNombreCafe,
    ctxTempSala,
    ctxHumSala,
    numeroFactura: perfil?.ordenes_trabajo?.numero_factura,
    nombreTostador: perfil?.empleados?.nombre,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto pt-12 lg:pt-0">
        <p className="text-muted-foreground">Cargando perfil de tueste...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 pb-32 px-0 md:px-1">
      <TuesteHeader
        perfilId={perfilId}
        perfil={perfil}
        currentMinute={currentMinute}
        isOnline={isOnline}
        onDescargarPDF={descargarPDF}
      />

      <ContextHeader
        perfil={perfil}
        empleados={empleados}
        numeroFactura={perfil?.ordenes_trabajo?.numero_factura}
        nombreTostador={perfil?.empleados?.nombre}
        editContext={editContext}
        setEditContext={setEditContext}
        ctxNombreCafe={ctxNombreCafe}
        setCtxNombreCafe={setCtxNombreCafe}
        ctxIdTostador={ctxIdTostador}
        setCtxIdTostador={setCtxIdTostador}
        ctxTempSala={ctxTempSala}
        setCtxTempSala={setCtxTempSala}
        ctxHumSala={ctxHumSala}
        setCtxHumSala={setCtxHumSala}
        onGuardar={guardarContexto}
      />

      <RendimientosTable
        metricas={metricas}
        setMetricas={setMetricas}
        calcularDiferencia={calcularDiferencia}
        onGuardarMetrica={guardarMetrica}
      />

      <TemperatureInput
        temperatura={temperatura}
        setTemperatura={setTemperatura}
        minutoManual={minutoManual}
        setMinutoManual={setMinutoManual}
        timeStep={timeStep}
        setTimeStep={setTimeStep}
        currentMinute={currentMinute}
        inputRef={inputRef}
        onRegistrar={registrarTemperatura}
      />

      <QuickMilestones
        hitos={hitos}
        editHitosOpen={editHitosOpen}
        setEditHitosOpen={setEditHitosOpen}
        editHitosData={editHitosData}
        setEditHitosData={setEditHitosData}
        onRegistrarHito={registrarHito}
        onGuardarHitos={guardarTodosHitos}
      />

      <LiveChart
        puntos={puntos}
        hitos={hitos}
        currentMinute={currentMinute}
        isMobile={isMobile}
        chartRef={chartRef}
      />

      <MachineAdjustments
        ajustes={ajustes}
        setAjustes={setAjustes}
        ajustesOpen={ajustesOpen}
        setAjustesOpen={setAjustesOpen}
        onAgregar={agregarAjuste}
        onEliminar={eliminarAjuste}
        onGuardar={guardarAjuste}
      />

      <RegisteredMilestones hitos={hitos} />

      {showResumen && resumen && <Summary resumen={resumen} />}

      <FinalizeButton
        showResumen={showResumen}
        onFinalizar={() => finalizarTueste(isOnline)}
      />
    </div>
  );
}
