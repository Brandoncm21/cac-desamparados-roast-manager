"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { FormularioEtapa } from "@/components/beneficio/formulario-etapa";
import { FormularioCaracterizacion } from "@/components/beneficio/formulario-caracterizacion";
import { FormularioSecado } from "@/components/beneficio/formulario-secado";
import { FormularioBodegaje } from "@/components/beneficio/formulario-bodegaje";
import { FormularioTrilla } from "@/components/beneficio/formulario-trilla";
import { FormularioCalificacion } from "@/components/beneficio/formulario-calificacion";
import {
  listarRecibidos,
  obtenerEtapa,
  type EtapaBeneficioNombre,
  type EtapaFila,
  type RecibidoLote,
} from "@/lib/api/beneficio";
import { ESTADOS_BENEFICIO } from "@/lib/schemas/beneficio";
import { getCurrentUserRole, type UserRole } from "@/lib/auth-helpers";
import { DESCRIPCION_ETAPA, TITULO_ETAPA } from "@/lib/beneficio/campos";
import { detalleDeError } from "@/lib/api/http";

interface EtapaPageProps {
  etapa: EtapaBeneficioNombre;
}

interface DialogoAbierto {
  lote: RecibidoLote;
  fila: EtapaFila | null;
  cargando: boolean;
}

export function EtapaPage({ etapa }: EtapaPageProps) {
  const [lotes, setLotes] = useState<RecibidoLote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dialogo, setDialogo] = useState<DialogoAbierto | null>(null);

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { items, pagination } = await listarRecibidos({
        page,
        pageSize,
        enproceso: estado || undefined,
        search: debouncedSearch || undefined,
      });
      setLotes(items);
      setTotal(pagination.total);
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setCargando(false);
    }
  }, [page, pageSize, estado, debouncedSearch]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const puedeEscribir =
    etapa === "catacion" || etapa === "calificacion"
      ? userRole === "Admin" || userRole === "Tostador"
      : userRole === "Admin" || userRole === "Recepción";

  const abrir = async (lote: RecibidoLote) => {
    setDialogo({ lote, fila: null, cargando: true });
    try {
      const fila = await obtenerEtapa(lote.id_lote, etapa);
      setDialogo({ lote, fila, cargando: false });
    } catch (error) {
      toast.error(detalleDeError(error));
      setDialogo(null);
    }
  };

  const cerrar = () => setDialogo(null);

  const alGuardar = () => {
    cerrar();
    cargar();
  };

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{TITULO_ETAPA[etapa]}</h1>
          <p className="text-sm text-muted-foreground">{DESCRIPCION_ETAPA[etapa]}</p>
        </div>
        <Link href="/beneficio/recibido">
          <Button variant="outline">Recibido de Café</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por N° de lote..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={estado}
          onValueChange={(v) => {
            setEstado(v ?? "");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {ESTADOS_BENEFICIO.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Lote</TableHead>
              <TableHead className="hidden md:table-cell">Recibo</TableHead>
              <TableHead>Productor</TableHead>
              <TableHead className="hidden lg:table-cell">Finca</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : lotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No hay lotes que coincidan con el filtro.
                </TableCell>
              </TableRow>
            ) : (
              lotes.map((lote) => (
                <TableRow key={lote.id_lote}>
                  <TableCell className="font-mono">{lote.numero_lote}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono">
                    {lote.numero_recibo}
                  </TableCell>
                  <TableCell>{lote.productores?.nombre_completo ?? "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {lote.fincas?.nombre ?? "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {new Date(lote.fecha_recibido).toLocaleDateString("es-CR")}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={lote.enproceso} familia="lote" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/beneficio/recibido/${lote.id_lote}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                      {puedeEscribir && lote.enproceso !== "Vendido" && (
                        <Button variant="outline" size="sm" onClick={() => abrir(lote)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          Registrar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={dialogo !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {TITULO_ETAPA[etapa]} — {dialogo?.lote.numero_lote ?? ""}
            </DialogTitle>
            <DialogDescription>
              {dialogo?.lote.productores?.nombre_completo ?? ""} ·{" "}
              {dialogo?.lote.fincas?.nombre ?? ""}
            </DialogDescription>
          </DialogHeader>

          {dialogo?.cargando ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dialogo ? (
            etapa === "caracterizacion" ? (
              <FormularioCaracterizacion
                key={dialogo.lote.id_lote}
                lote={dialogo.lote}
                initial={dialogo.fila}
                onSaved={alGuardar}
                onCancel={cerrar}
              />
            ) : etapa === "secado" ? (
              <FormularioSecado
                key={dialogo.lote.id_lote}
                lote={dialogo.lote}
                initial={dialogo.fila}
                onSaved={alGuardar}
                onCancel={cerrar}
              />
            ) : etapa === "bodegaje" ? (
              <FormularioBodegaje
                key={dialogo.lote.id_lote}
                lote={dialogo.lote}
                initial={dialogo.fila}
                onSaved={alGuardar}
                onCancel={cerrar}
              />
            ) : etapa === "trilla" ? (
              <FormularioTrilla
                key={dialogo.lote.id_lote}
                lote={dialogo.lote}
                initial={dialogo.fila}
                onSaved={alGuardar}
                onCancel={cerrar}
              />
            ) : etapa === "calificacion" ? (
              <FormularioCalificacion
                key={dialogo.lote.id_lote}
                lote={dialogo.lote}
                initial={dialogo.fila}
                onSaved={alGuardar}
                onCancel={cerrar}
              />
            ) : (
              <FormularioEtapa
                key={dialogo.lote.id_lote}
                etapa={etapa}
                idLote={dialogo.lote.id_lote}
                initial={dialogo.fila}
                onSaved={alGuardar}
                onCancel={cerrar}
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
