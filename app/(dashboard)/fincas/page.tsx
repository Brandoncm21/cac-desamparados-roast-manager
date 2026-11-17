"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Plus, Search, Pencil, Trash2, Mountain, MapPin } from "lucide-react";
import { toast } from "sonner";
import { eliminarFinca, type FincaOpcion } from "@/lib/fincas";

interface ClienteOpcion {
  id_cliente: number;
  nombre_completo: string;
}

const TODOS = "__todos__";

export default function FincasPage() {
  const [fincas, setFincas] = useState<FincaOpcion[]>([]);
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  const puedeEditar = userRole === "Admin" || userRole === "Recepción";

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
    fetch("/api/clientes?pageSize=100&page=1")
      .then((r) => r.json())
      .then((j) => setClientes(j.data ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (clienteFiltro) params.set("cliente_id", String(clienteFiltro));

    const res = await fetch(`/api/fincas?${params}`);
    const result = await res.json();
    if (!res.ok) {
      toast.error("Error al cargar fincas: " + (result.error?.message || "Error desconocido"));
      return;
    }
    setFincas(result.data ?? []);
    setTotalItems(result.pagination?.total ?? 0);
  }, [debouncedSearch, clienteFiltro, page, pageSize]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const eliminar = async (finca: FincaOpcion) => {
    if (!window.confirm(`¿Eliminar la finca "${finca.nombre}"?`)) return;
    try {
      await eliminarFinca(finca.id_finca);
      toast.success("Finca eliminada");
      cargar();
    } catch (e) {
      toast.error("No se pudo eliminar: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <div>
          <h1 className="text-2xl font-bold">Fincas</h1>
          <p className="text-sm text-muted-foreground">
            Fincas por productor: zona, ubicación y altura (msnm) que usan los lotes y las órdenes.
          </p>
        </div>
        {puedeEditar && (
          <Link href="/fincas/nueva">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Finca
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de finca..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:w-64">
          <Select
            items={[
              { value: TODOS, label: "Todos los productores" },
              ...clientes.map((c) => ({ value: String(c.id_cliente), label: c.nombre_completo })),
            ]}
            value={clienteFiltro ? String(clienteFiltro) : TODOS}
            onValueChange={(v) => {
              setClienteFiltro(v && v !== TODOS ? Number(v) : null);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los productores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los productores</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id_cliente} value={String(c.id_cliente)}>
                  {c.nombre_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Finca</TableHead>
              <TableHead>Productor</TableHead>
              <TableHead className="hidden md:table-cell">Zona</TableHead>
              <TableHead className="hidden md:table-cell">Ubicación</TableHead>
              <TableHead>Altura</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fincas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin fincas registradas. Creá la primera con “Nueva Finca”.
                </TableCell>
              </TableRow>
            )}
            {fincas.map((f) => (
              <TableRow key={f.id_finca}>
                <TableCell>
                  <Link href={`/fincas/${f.id_finca}`} className="font-medium hover:underline">
                    {f.nombre}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {f.clientes?.nombre_completo ?? "-"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {f.zonas_finca?.nombre ? (
                    <Badge variant="secondary">{f.zonas_finca.nombre}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Sin zona</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {f.ubicacion ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {f.ubicacion}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {f.altura != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
                      {f.altura} msnm
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/fincas/${f.id_finca}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                    {puedeEditar && (
                      <>
                        <Link href={`/fincas/${f.id_finca}/editar`}>
                          <Button variant="outline" size="sm" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Eliminar"
                          onClick={() => eliminar(f)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
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
        totalPages={Math.max(Math.ceil(totalItems / pageSize), 1)}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
