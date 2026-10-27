"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Search, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PrecioEmpaque {
  precio: number;
  valid_from: string;
  valid_to: string | null;
}

interface Empaque {
  id_empaque: number;
  nombre: string;
  capacidad_kg: number | null;
  activo: boolean;
  empaque_precios: PrecioEmpaque[];
}

function precioVigente(empaque: Empaque): number | null {
  const vigentes = (empaque.empaque_precios || []).filter((p) => !p.valid_to);
  if (vigentes.length === 0) return null;
  return vigentes[0]?.precio ?? null;
}

export default function AdminEmpaquesPage() {
  const router = useRouter();
  const [empaques, setEmpaques] = useState<Empaque[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/admin/empaques?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error(
          "Error al cargar empaques: " + (result.error?.message || "Error desconocido")
        );
      } else {
        setEmpaques(result.data ?? []);
        setTotalItems(result.pagination?.total ?? 0);
      }
      setLoading(false);
    };
    load();
  }, [debouncedSearch, page, pageSize]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const desactivar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Desactivar el empaque "${nombre}"? Los datos históricos se preservan.`)) return;

    const res = await fetch(`/api/admin/empaques/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      toast.error(
        "Error al desactivar empaque: " + (result.error?.message || "Error desconocido")
      );
      return;
    }
    toast.success("Empaque desactivado");
    setEmpaques((prev) => prev.map((e) => (e.id_empaque === id ? { ...e, activo: false } : e)));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Empaques</h1>
        <Button onClick={() => router.push("/admin/empaques/nuevo")}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Empaque
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de Empaques</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : empaques.length === 0 ? (
            <p className="text-muted-foreground">No hay empaques registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Capacidad (kg)</TableHead>
                  <TableHead className="text-right">Precio (₡)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empaques.map((e) => (
                  <TableRow key={e.id_empaque}>
                    <TableCell className="font-medium">{e.nombre}</TableCell>
                    <TableCell>{e.capacidad_kg ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {precioVigente(e) != null ? `₡${Number(precioVigente(e)).toLocaleString()}` : <Badge variant="outline">Sin precio</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.activo ? "completado" : "cancelado"}>
                        {e.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/empaques/${e.id_empaque}/editar`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {e.activo && (
                          <Button variant="ghost" size="icon" onClick={() => desactivar(e.id_empaque, e.nombre)}>
                            <span className="text-xs">Off</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
