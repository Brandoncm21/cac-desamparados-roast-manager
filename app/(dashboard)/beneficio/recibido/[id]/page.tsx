"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { FormularioEtapa } from "@/components/beneficio/formulario-etapa";
import {
  obtenerRecibido,
  type EtapaBeneficioNombre,
  type EtapaFila,
  type RecibidoDetalle,
} from "@/lib/api/beneficio";
import {
  CAMPOS_ETAPA,
  DESCRIPCION_ETAPA,
  TITULO_ETAPA,
  type EtapaNombre,
} from "@/lib/beneficio/campos";
import { getCurrentUserRole, type UserRole } from "@/lib/auth-helpers";
import { detalleDeError } from "@/lib/api/http";

const ETAPAS: EtapaNombre[] = ["caracterizacion", "secado", "bodegaje", "trilla", "catacion"];

function formatearValor(tipo: string, valor: unknown): string {
  if (valor == null || valor === "") return "—";
  if (tipo === "booleano") return valor ? "Sí" : "No";
  if (tipo === "fecha") {
    const [anio, mes, dia] = String(valor).slice(0, 10).split("-");
    return dia && mes && anio ? `${dia}/${mes}/${anio}` : String(valor);
  }
  if (tipo === "fechaHora") return new Date(String(valor)).toLocaleString("es-CR");
  return String(valor);
}

function ResumenEtapa({ etapa, fila }: { etapa: EtapaNombre; fila: EtapaFila }) {
  const campos = CAMPOS_ETAPA[etapa].filter(
    (campo) => fila[campo.key] != null && fila[campo.key] !== ""
  );

  if (campos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos capturados.</p>;
  }

  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {campos.map((campo) => (
        <div key={campo.key} className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
          <dt className="text-muted-foreground">{campo.label}</dt>
          <dd className="text-right font-medium">
            {formatearValor(campo.tipo, fila[campo.key])}
            {campo.unidad && fila[campo.key] != null ? ` ${campo.unidad}` : ""}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function RecibidoDetallePage() {
  const params = useParams<{ id: string }>();
  const idLote = Number(params.id);

  const [lote, setLote] = useState<RecibidoDetalle | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dialogo, setDialogo] = useState<{
    etapa: EtapaNombre;
    fila: EtapaFila | null;
  } | null>(null);

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  const cargar = useCallback(async () => {
    if (!Number.isInteger(idLote) || idLote <= 0) {
      setCargando(false);
      return;
    }
    try {
      setLote(await obtenerRecibido(idLote));
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setCargando(false);
    }
  }, [idLote]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const puedeEscribir = (etapa: EtapaNombre) =>
    etapa === "catacion"
      ? userRole === "Admin" || userRole === "Tostador"
      : userRole === "Admin" || userRole === "Recepción";

  if (cargando) {
    return (
      <div className="mt-6 py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-muted-foreground">No se encontró el lote solicitado.</p>
        <Link href="/beneficio/recibido">
          <Button variant="outline">Volver a Recibido</Button>
        </Link>
      </div>
    );
  }

  const etapaActual = lote.enproceso;

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/beneficio/recibido">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">{lote.numero_lote}</h1>
            <p className="text-sm text-muted-foreground">
              Recibo {lote.numero_recibo} · {lote.productores?.nombre_completo ?? "-"} ·{" "}
              {lote.fincas?.nombre ?? "-"}
            </p>
          </div>
        </div>
        <EstadoBadge estado={etapaActual} familia="lote" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del recibo</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Fecha de recibido</dt>
              <dd>{new Date(lote.fecha_recibido).toLocaleDateString("es-CR")}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Factura</dt>
              <dd>{lote.factura || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Varietal</dt>
              <dd>{lote.varietal || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Cajuelas / cuartillos</dt>
              <dd>
                {lote.cajuelas ?? "—"} / {lote.cuartillos ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Proceso</dt>
              <dd>{lote.proceso || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">pH de miel</dt>
              <dd>{lote.ph_miel ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Flote / broca / vano</dt>
              <dd>
                {lote.porcentaje_flote ?? "—"}% / {lote.porcentaje_broca ?? "—"}% /{" "}
                {lote.porcentaje_vano ?? "—"}%
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Verde / secos</dt>
              <dd>
                {lote.porcentaje_verde ?? "—"}% / {lote.porcentaje_secos ?? "—"}%
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-outline-variant/60 py-1">
              <dt className="text-muted-foreground">Altura de finca</dt>
              <dd>{lote.fincas?.altura != null ? `${lote.fincas.altura} msnm` : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {ETAPAS.map((etapa) => {
        const fila = lote.etapas[etapa as EtapaBeneficioNombre] ?? null;
        const editable = puedeEscribir(etapa) && etapaActual !== "Vendido";

        return (
          <Card key={etapa}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>{TITULO_ETAPA[etapa]}</CardTitle>
                <p className="text-xs text-muted-foreground">{DESCRIPCION_ETAPA[etapa]}</p>
              </div>
              {editable && (
                <Button
                  variant={fila ? "outline" : "default"}
                  size="sm"
                  onClick={() => setDialogo({ etapa, fila })}
                >
                  {fila ? (
                    <>
                      <Pencil className="mr-1 h-4 w-4" /> Editar
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" /> Registrar
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {fila ? (
                <ResumenEtapa etapa={etapa} fila={fila} />
              ) : (
                <p className="text-sm text-muted-foreground">Pendiente de registro.</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={dialogo !== null} onOpenChange={(abierto) => !abierto && setDialogo(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialogo ? `${TITULO_ETAPA[dialogo.etapa]} — ${lote.numero_lote}` : ""}
            </DialogTitle>
            <DialogDescription>{lote.productores?.nombre_completo ?? ""}</DialogDescription>
          </DialogHeader>
          {dialogo && (
            <FormularioEtapa
              key={`${dialogo.etapa}-${lote.id_lote}`}
              etapa={dialogo.etapa}
              idLote={lote.id_lote}
              initial={dialogo.fila}
              onSaved={() => {
                setDialogo(null);
                cargar();
              }}
              onCancel={() => setDialogo(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
