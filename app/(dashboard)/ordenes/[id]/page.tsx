"use client";

import { useParams, useRouter } from "next/navigation";

import { canDeleteOrder, canEditOrder } from "@/lib/auth-helpers";
import { PasosPanel } from "@/components/ordenes/pasos-panel";
import { AccionesOrden } from "./components/AccionesOrden";
import { OrdenImprimible } from "./components/OrdenImprimible";
import { ResumenTueste } from "./components/ResumenTueste";
import { SeccionTueste } from "./components/SeccionTueste";
import { useOrdenDetalle } from "./hooks/useOrdenDetalle";

export default function OrdenDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const detalle = useOrdenDetalle(Number(params.id));

  if (!detalle.orden) return <p>Cargando...</p>;

  const { orden } = detalle;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AccionesOrden
        numeroFactura={orden.numero_factura}
        estado={orden.estado_orden}
        puedeEditar={canEditOrder(detalle.userRole)}
        puedeEliminar={canDeleteOrder(detalle.userRole)}
        onVolver={() => router.back()}
        onCambiarEstado={detalle.cambiarEstado}
        onEditar={() => router.push(`/ordenes/${params.id}/editar`)}
        onEliminar={detalle.eliminar}
        onImprimir={detalle.imprimir}
      />

      <OrdenImprimible orden={orden} total={detalle.total} />

      {detalle.tieneTueste && (
        <SeccionTueste
          cargando={detalle.cargandoPerfil}
          idPerfil={detalle.perfil?.id_perfil ?? null}
          creandoPerfil={detalle.creandoPerfil}
          onVerPerfil={() =>
            detalle.perfil && router.push(`/tueste/${detalle.perfil.id_perfil}`)
          }
          onIniciarTueste={detalle.iniciarTueste}
        />
      )}

      {detalle.perfil && <ResumenTueste perfil={detalle.perfil} metricas={detalle.metricas} />}

      <PasosPanel idOrden={orden.id_orden} />
    </div>
  );
}
