"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { SeccionAprobacion, SeccionEncabezado } from "./components/SeccionEncabezado";
import { SeccionCliente } from "./components/SeccionCliente";
import { SeccionHumedad } from "./components/SeccionHumedad";
import { SeccionLotes } from "./components/SeccionLotes";
import { SeccionResponsable } from "./components/SeccionResponsable";
import { SeccionServicios } from "./components/SeccionServicios";
import { SeccionTuesteEmpaque } from "./components/SeccionTuesteEmpaque";
import { useNuevaOrden } from "./hooks/useNuevaOrden";
import { useOrdenFormulario } from "./hooks/useOrdenFormulario";

// El resumen de confirmación solo se necesita al enviar: se carga bajo demanda.
const ConfirmarOrdenDialog = dynamic(
  () => import("./components/ConfirmarOrdenDialog").then((m) => m.ConfirmarOrdenDialog),
  { ssr: false, loading: () => null }
);

export default function NuevaOrdenPage() {
  const router = useRouter();
  const form = useOrdenFormulario();
  const { flags, ...orden } = useNuevaOrden(form);

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pb-32 pt-12 lg:pt-0">
      <h1 className="text-xl md:text-2xl font-bold">Nueva Orden de Trabajo</h1>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(orden.solicitarConfirmacion)}
          className="space-y-4 md:space-y-6"
        >
          <SeccionCliente form={form} clientes={orden.clientes} />

          <SeccionLotes
            lotes={orden.lotesOrden}
            seleccionados={orden.lotesSeleccionados}
            onAlternar={orden.alternarLote}
          />

          <SeccionServicios
            form={form}
            fields={orden.fields}
            serviciosActivos={orden.serviciosActivos}
            idsSeleccionados={orden.idsSeleccionados}
            onAgregar={orden.agregarServicio}
            onQuitar={orden.quitarServicio}
          />

          {flags.hayHumedad && <SeccionHumedad form={form} />}

          <SeccionResponsable form={form} empleados={orden.empleados} />

          <SeccionTuesteEmpaque
            form={form}
            hayTueste={flags.hayTueste}
            hayMolido={flags.hayMolido}
            hayEmpaque={flags.hayEmpaque}
          />

          <SeccionEncabezado form={form} />

          <SeccionAprobacion form={form} />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              className="flex-1 h-14 md:h-12 text-base md:text-lg font-bold"
              disabled={orden.submitting}
            >
              {orden.submitting ? "Creando..." : "Crear Orden"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-14 md:h-12"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmarOrdenDialog
        open={orden.confirmOpen}
        onOpenChange={orden.setConfirmOpen}
        pending={orden.pendingValues}
        clientes={orden.clientes}
        empleados={orden.empleados}
        flags={{
          hayTueste: flags.hayTueste,
          hayMolido: flags.hayMolido,
          hayEmpaque: flags.hayEmpaque,
        }}
        submitting={orden.submitting}
        onConfirm={orden.confirmar}
      />
    </div>
  );
}
