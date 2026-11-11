"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Plus, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Catacion {
  id_catacion_tueste: number;
  nlote: string | null;
  pfinales: number | null;
  ffreposo: string | null;
  created_at: string;
  perfiles_tueste: {
    id_orden: number | null;
    numero_lote: string | null;
    nombre_cafe: string | null;
    estado: string;
  } | null;
  lotes_cafe: {
    id_lote: number;
    nlote: string;
    enproceso: string | null;
    clientes: { nombre_completo: string } | null;
    fincas: { nombre: string; altura: number | null } | null;
  } | null;
}

const can = (rol: string | null) => rol === "Tostador" || rol === "Admin";

export default function CatacionesPage() {
  const [cataciones, setCataciones] = useState<Catacion[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCataciones = async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const res = await fetch(`/api/cataciones?${params}`);
    const result = await res.json();
    if (!res.ok) {
      toast.error("Error al cargar cataciones: " + (result.error?.message || "Error desconocido"));
      return;
    }
    setCataciones(result.data ?? []);
    setTotalItems(result.data?.total ?? 0);
  };

  useEffect(() => {
    loadCataciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize]);

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

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

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por lote..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil Cataado</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Puntaje Final</TableHead>
              <TableHead className="hidden md:table-cell">Fecha Reposo</TableHead>
              <TableHead className="hidden md:table-cell">Registro</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cataciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin cataciones registradas. El pipeline acopio→trilla→orden→tueste alimenta esta tabla.
                </TableCell>
              </TableRow>
            )}
            {cataciones.map((c) => (
              <TableRow key={c.id_catacion_tueste}>
                <TableCell>
                  {c.perfiles_tueste?.numero_lote || c.perfiles_tueste?.nombre_cafe || `Perfil #${c.perfiles_tueste?.id_orden ?? "-"}`}
                </TableCell>
                <TableCell>
                  <div className="font-mono">{c.nlote || "-"}</div>
                  {(c.lotes_cafe?.fincas?.nombre || c.lotes_cafe?.clientes?.nombre_completo) && (
                    <div className="text-xs text-muted-foreground">
                      {c.lotes_cafe?.fincas?.nombre ?? "-"} · {c.lotes_cafe?.clientes?.nombre_completo ?? "-"}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {c.pfinales != null ? (
                    <span className="font-semibold">{c.pfinales}</span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {c.ffreposo ? new Date(c.ffreposo).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(c.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/cataciones/${c.id_catacion_tueste}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                    {can(userRole) && (
                      <Link href={`/cataciones/${c.id_catacion_tueste}/editar`}>
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
        totalPages={Math.ceil(totalItems / pageSize)}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
