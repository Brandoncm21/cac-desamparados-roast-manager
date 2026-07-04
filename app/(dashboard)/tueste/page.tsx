"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SelectOrdenDialog } from "@/components/forms/select-orden-dialog";
import { Plus, Thermometer, Search } from "lucide-react";
import { toast } from "sonner";

interface Perfil {
  id_perfil: number;
  numero_lote: string | null;
  nombre_cafe: string | null;
  fecha_tueste: string;
  ordenes_trabajo: {
    numero_factura: string;
    clientes: { nombre_completo: string } | null;
  } | null;
}

export default function TuesteListPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectOrdenOpen, setSelectOrdenOpen] = useState(false);

  // Filtros y paginación
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
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

  // Reset página al cambiar fechas
  useEffect(() => {
    setPage(1);
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    const load = async () => {
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;

      let query = supabase
        .from("perfiles_tueste")
        .select(
          `
          *,
           ordenes_trabajo (
            numero_factura,
            clientes (nombre_completo)
          )
        `,
          { count: "exact" }
        )
        .order("fecha_tueste", { ascending: false })
        .range(from, to);

      if (fechaDesde) {
        query = query.gte("fecha_tueste", fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte("fecha_tueste", fechaHasta);
      }

      const { data, count } = await query;
      if (data) {
        setPerfiles(data as unknown as Perfil[]);
      }
      setTotalItems(count || 0);
    };
    load();
  }, [debouncedSearch, fechaDesde, fechaHasta, page, pageSize, supabase]);

  // Filtrado client-side por búsqueda de texto
  const filteredPerfiles = useMemo(() => {
    if (!debouncedSearch) return perfiles;
    const term = debouncedSearch.toLowerCase();
    return perfiles.filter((p) => {
      const factura = p.ordenes_trabajo?.numero_factura || "";
      const cliente = p.ordenes_trabajo?.clientes?.nombre_completo || "";
      const nombre = p.nombre_cafe || "";
      return (
        factura.toLowerCase().includes(term) ||
        cliente.toLowerCase().includes(term) ||
        nombre.toLowerCase().includes(term)
      );
    });
  }, [perfiles, debouncedSearch]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const crearPerfil = async (ordenId?: number) => {
    if (creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("perfiles_tueste")
        .insert({
          nombre_cafe: "Nuevo lote",
          id_orden: ordenId || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Error al crear perfil: " + error.message);
        return;
      }

      if (data) {
        router.push(`/tueste/${data.id_perfil}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleOpenSelectOrden = () => {
    setSelectOrdenOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Captura de Tueste</h1>
        <Button onClick={handleOpenSelectOrden} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          {creating ? "Creando..." : "Nuevo Perfil"}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por factura, cliente o nombre de lote..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          placeholder="Desde"
          className="sm:w-44"
        />
        <Input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          placeholder="Hasta"
          className="sm:w-44"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPerfiles.map((p) => (
          <Card
            key={p.id_perfil}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/tueste/${p.id_perfil}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Thermometer className="h-5 w-5 text-secondary" />
                {p.numero_lote || `Perfil #${p.id_perfil}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{p.nombre_cafe || "Sin nombre"}</p>
              {p.ordenes_trabajo?.numero_factura && (
                <p>Factura: {p.ordenes_trabajo.numero_factura}</p>
              )}
              {p.ordenes_trabajo?.clientes?.nombre_completo && (
                <p>Cliente: {p.ordenes_trabajo.clientes.nombre_completo}</p>
              )}
              <p>{p.fecha_tueste}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <SelectOrdenDialog
        open={selectOrdenOpen}
        onOpenChange={setSelectOrdenOpen}
        onSelect={(ordenId) => {
          setSelectOrdenOpen(false);
          crearPerfil(ordenId);
        }}
      />
    </div>
  );
}
