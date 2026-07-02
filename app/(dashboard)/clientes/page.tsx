"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface Cliente {
  id_cliente: number;
  nombre_completo: string;
  telefono: string | null;
  zona_procedencia: string | null;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      let query = supabase.from("clientes").select("*").order("nombre_completo");
      if (search) {
        query = query.or(`nombre_completo.ilike.%${search}%,telefono.ilike.%${search}%`);
      }
      const { data } = await query;
      if (data) setClientes(data);
    };
    load();
  }, [search, supabase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <Card key={cliente.id_cliente}>
            <CardHeader>
              <CardTitle className="text-lg">{cliente.nombre_completo}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              {cliente.telefono && <p>📞 {cliente.telefono}</p>}
              {cliente.zona_procedencia && <p>📍 {cliente.zona_procedencia}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
