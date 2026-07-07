"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Search, Plus } from "lucide-react";
import Link from "next/link";

interface Cliente {
  id_cliente: number;
  nombre_completo: string;
  telefono: string | null;
  zona_procedencia: string | null;
}

export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), []);
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
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;

      let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order("nombre_completo")
        .range(from, to);

      if (debouncedSearch) {
        const term = debouncedSearch.trim();
        query = query.or(`nombre_completo.ilike.%${term}%,telefono.ilike.%${term}%`);
      }

      const { data, count } = await query;
      if (data) setClientes(data);
      setTotalItems(count || 0);
    };
    load();
  }, [debouncedSearch, page, pageSize, supabase]);

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
