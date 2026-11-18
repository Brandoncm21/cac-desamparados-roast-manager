"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Loader2 } from "lucide-react";
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
import { EstadoBadge } from "@/components/ui/estado-badge";
import { desactivarRecibido, listarRecibidos, type RecibidoLote } from "@/lib/api/beneficio";
import { ESTADOS_BENEFICIO } from "@/lib/schemas/beneficio";
import { canDeleteLote, canEditLote, getCurrentUserRole, type UserRole } from "@/lib/auth-helpers";
import { detalleDeError } from "@/lib/api/http";

export default function RecibidoPage() {
  const [lotes, setLotes] = useState<RecibidoLote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [cargando, setCargando] = useState(true);

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

  const eliminar = async (id: number) => {
    if (!window.confirm("¿Desactivar este lote recibido? Podrá consultarse, pero no editarse.")) {
      return;
    }

    try {
      await desactivarRecibido(id);
      toast.success("Lote desactivado");
      cargar();
    } catch (error) {
      toast.error(detalleDeError(error));
    }
  };

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Recibido de Café</h1>
          <p className="text-sm text-muted-foreground">
            Entrada de cosecha: aquí nace el lote y arranca su trazabilidad.
          </p>
        </div>
        {canEditLote(userRole) && (
          <Link href="/beneficio/recibido/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Recibido
            </Button>
          </Link>
        )}
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
        <Select value={estado} onValueChange={(v) => { setEstado(v ?? ""); setPage(1); }}>
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
              <TableHead className="hidden sm:table-cell">Recibido</TableHead>
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
                  Todavía no hay lotes recibidos.
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
                      {canDeleteLote(userRole) && lote.enproceso !== "Vendido" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => eliminar(lote.id_lote)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
