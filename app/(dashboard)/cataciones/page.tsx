"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { getCurrentUserRole } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { detalleDeError } from "@/lib/api/http";
import { listarLotesCatacion, type FiltroCatado, type LoteCatacion } from "@/lib/api/cataciones";

const FILTROS: { valor: FiltroCatado; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "si", etiqueta: "Catados" },
  { valor: "no", etiqueta: "No catados" },
];

const can = (rol: string | null) => rol === "Tostador" || rol === "Admin";

/**
 * Lista de lotes enfocada en el estado de catación.
 *
 * La pregunta que responde la pantalla es "¿este lote se cató?", por eso las
 * filas son lotes y no registros de catación.
 */
export default function CatacionesPage() {
  const [lotes, setLotes] = useState<LoteCatacion[]>([]);
  const [filtro, setFiltro] = useState<FiltroCatado>("todos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      try {
        const { lotes: filas, pagination } = await listarLotesCatacion({
          page,
          pageSize,
          estado: filtro,
          search: debouncedSearch,
        });
        if (!vigente) return;
        setLotes(filas);
        setTotalItems(pagination.total);
        setTotalPages(pagination.totalPages);
      } catch (error) {
        if (vigente) toast.error("Error al cargar cataciones: " + detalleDeError(error));
      }
    };

    cargar();

    return () => {
      vigente = false;
    };
  }, [filtro, debouncedSearch, page, pageSize]);

  const cambiarFiltro = (nuevo: FiltroCatado) => {
    setFiltro(nuevo);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Cataciones</h1>
        {can(userRole) && (
          <Link href="/cataciones/nueva">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Catación
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((opcion) => (
            <Button
              key={opcion.valor}
              type="button"
              size="sm"
              variant={filtro === opcion.valor ? "default" : "outline"}
              onClick={() => cambiarFiltro(opcion.valor)}
            >
              {opcion.etiqueta}
            </Button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote..."
            className="pl-10"
            value={search}
            onChange={(evento) => setSearch(evento.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead className="hidden md:table-cell">Productor</TableHead>
              <TableHead className="hidden md:table-cell">Finca</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Catado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay lotes para este filtro.
                </TableCell>
              </TableRow>
            )}
            {lotes.map((lote) => (
              <TableRow key={lote.id_lote}>
                <TableCell className="font-mono">{lote.nlote}</TableCell>
                <TableCell className="hidden md:table-cell">{lote.cliente ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{lote.finca ?? "—"}</TableCell>
                <TableCell>
                  <EstadoBadge estado={lote.enproceso} familia="lote" />
                </TableCell>
                <TableCell>
                  {lote.catado ? (
                    <Badge className="bg-green-100 text-green-800">Sí</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">No</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {lote.id_catacion_tueste ? (
                      <Link href={`/cataciones/${lote.id_catacion_tueste}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    ) : null}
                    {can(userRole) && (
                      <Link
                        href={
                          lote.id_catacion_tueste
                            ? `/cataciones/${lote.id_catacion_tueste}/editar`
                            : `/cataciones/nueva?lote=${lote.id_lote}`
                        }
                      >
                        <Button variant="outline" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(nuevo) => {
          setPageSize(nuevo);
          setPage(1);
        }}
      />
    </div>
  );
}
