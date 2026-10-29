"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Cliente {
  id_cliente: number;
  nombre_completo: string;
  telefono: string | null;
  zona_procedencia: string | null;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
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

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/clientes?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error(
          "Error al cargar clientes: " + (result.error?.message || "Error desconocido")
        );
        return;
      }
      setClientes(result.data ?? []);
      setTotalItems(result.pagination?.total ?? 0);
    };
    load();
  }, [debouncedSearch, page, pageSize]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clientes.map((cliente) => (
          <Link key={cliente.id_cliente} href={`/clientes/${cliente.id_cliente}`} className="block">
            <Card className="h-full transition-all hover:shadow-md hover:border-secondary cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{cliente.nombre_completo}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {cliente.telefono && <p>📞 {cliente.telefono}</p>}
                {cliente.zona_procedencia && <p>📍 {cliente.zona_procedencia}</p>}
              </CardContent>
            </Card>
          </Link>
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
    </div>
  );
}
