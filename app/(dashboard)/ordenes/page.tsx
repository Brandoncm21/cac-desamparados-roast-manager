"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Orden {
  id_orden: number;
  numero_factura: string;
  fecha_orden: string;
  estado_orden: string;
  clientes: { nombre_completo: string } | null;
}

const ESTADOS = ["Pendiente", "En Proceso", "Completado", "Cancelado"];

export default function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado: estadoParam } = use(searchParams);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [estado, setEstado] = useState(estadoParam || "");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset página al cambiar estado
  useEffect(() => {
    setPage(1);
  }, [estado]);

  useEffect(() => {
    const load = async () => {
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;

      let query = supabase
        .from("ordenes_trabajo")
        .select("*, clientes(nombre_completo)", { count: "exact" })
        .order("fecha_orden", { ascending: false })
        .range(from, to);

      if (estado) {
        query = query.eq("estado_orden", estado);
      }

      if (debouncedSearch) {
        const term = debouncedSearch.trim();
        query = query.or(
          `numero_factura.ilike.%${term}%,clientes.nombre_completo.ilike.%${term}%`
        );
      }

      const { data, count } = await query;
      if (data) {
        setOrdenes(data as unknown as Orden[]);
      }
      setTotalItems(count || 0);
    };
    load();
  }, [estado, debouncedSearch, page, pageSize, supabase]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    const { error } = await supabase
      .from("ordenes_trabajo")
      .update({ estado_orden: nuevoEstado })
      .eq("id_orden", id);

    if (error) {
      toast.error("Error al cambiar estado: " + error.message);
      return;
    }

    toast.success(`Estado actualizado a ${nuevoEstado}`);
    setOrdenes((prev) =>
      prev.map((o) => (o.id_orden === id ? { ...o, estado_orden: nuevoEstado } : o))
    );
    router.refresh();
  };

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      "En Proceso": "bg-blue-100 text-blue-800",
      Completado: "bg-green-100 text-green-800",
      Cancelado: "bg-red-100 text-red-800",
    };
    return colors[estado] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
        <Link href="/ordenes/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por factura o cliente..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v ?? "")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.map((orden) => (
              <TableRow key={orden.id_orden}>
                <TableCell className="font-mono">{orden.numero_factura}</TableCell>
                <TableCell>{orden.clientes?.nombre_completo || "-"}</TableCell>
                <TableCell>{orden.fecha_orden}</TableCell>
                <TableCell>
                  <Select
                    value={orden.estado_orden}
                    onValueChange={(v) => v && cambiarEstado(orden.id_orden, v)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge(orden.estado_orden)}`}>
                        {orden.estado_orden}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Link href={`/ordenes/${orden.id_orden}`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
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
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
