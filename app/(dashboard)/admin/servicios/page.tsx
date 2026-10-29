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

interface Intervalo {
  id_precio: number;
  precio_por_kg: number;
  min_weight_kg: number;
  max_weight_kg: number | null;
  activo: boolean;
}

interface ServicioMaestro {
  id_servicio_maestro: number;
  nombre: string;
  descripcion: string | null;
  prioridad: number;
  tipo: string;
  activo: boolean;
  servicio_precios: Intervalo[];
}

const ETIQUETAS_TIPO: Record<string, string> = {
  general: "General",
  tueste: "Tueste",
  empacado: "Empacado",
};

function formatearIntervalo(i: Intervalo): string {
  const min = Number(i.min_weight_kg);
  const max = i.max_weight_kg != null ? Number(i.max_weight_kg) : null;
  const rango = max == null ? `${min} kg o más` : `${min}–${max} kg`;
  return `${rango} · ₡${Number(i.precio_por_kg).toLocaleString()}/kg`;
}

export default function AdminServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<ServicioMaestro[]>([]);
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

      const res = await fetch(`/api/admin/servicios?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error(
          "Error al cargar servicios: " + (result.error?.message || "Error desconocido")
        );
      } else {
        setServicios(result.data ?? []);
        setTotalItems(result.pagination?.total ?? 0);
      }
      setLoading(false);
    };
    load();
  }, [debouncedSearch, page, pageSize]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Servicios</h1>
        <Button onClick={() => router.push("/admin/servicios/nuevo")}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
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
          <CardTitle className="text-base">Catálogo de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : servicios.length === 0 ? (
            <p className="text-muted-foreground">No hay servicios registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Intervalos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicios.map((s) => (
                  <TableRow key={s.id_servicio_maestro}>
                    <TableCell className="font-mono text-xs">{s.prioridad}</TableCell>
                    <TableCell className="font-medium">
                      {s.nombre}
                      {s.descripcion && (
                        <span className="block text-xs text-muted-foreground">{s.descripcion}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ETIQUETAS_TIPO[s.tipo] || "General"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {(s.servicio_precios || [])
                          .filter((i) => i.activo)
                          .map((i) => (
                            <p key={i.id_precio} className="text-xs text-muted-foreground">
                              {formatearIntervalo(i)}
                            </p>
                          ))}
                        {(!s.servicio_precios ||
                          s.servicio_precios.filter((i) => i.activo).length === 0) && (
                          <Badge variant="cancelado">Sin intervalos</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? "completado" : "cancelado"}>
                        {s.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/servicios/${s.id_servicio_maestro}/editar`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
