"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Orden {
  id_orden: number;
  num_talonario_fisico: string | null;
  fecha_orden: string;
  estado_orden: string;
  clientes: { nombre_completo: string } | null;
}

const ESTADOS = ["Pendiente", "En Proceso", "Completado", "Cancelado"];

export default function OrdenesPage({ searchParams }: { searchParams: { estado?: string } }) {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [estado, setEstado] = useState(searchParams.estado || "");
  const [search, setSearch] = useState("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from("ordenes_trabajo")
        .select("*, clientes(nombre_completo)")
        .order("fecha_orden", { ascending: false });

      if (estado) query = query.eq("estado_orden", estado);

      const { data } = await query;
      if (data) {
        const lista = data as unknown as Orden[];
        const filtrada = search
          ? lista.filter((o) =>
              (o.num_talonario_fisico || "").toLowerCase().includes(search.toLowerCase()) ||
              (o.clientes?.nombre_completo || "").toLowerCase().includes(search.toLowerCase())
            )
          : lista;
        setOrdenes(filtrada);
      }
    };
    load();
  }, [estado, search, supabase]);

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
      <div className="flex items-center justify-between">
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
            placeholder="Buscar por talonario o cliente..."
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
              <TableHead>N° Talonario</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.map((orden) => (
              <TableRow key={orden.id_orden}>
                <TableCell className="font-mono">{orden.num_talonario_fisico || "—"}</TableCell>
                <TableCell>{orden.clientes?.nombre_completo || "-"}</TableCell>
                <TableCell>{orden.fecha_orden}</TableCell>
                <TableCell>
                  <Select
                    value={orden.estado_orden}
                    onValueChange={(v) => cambiarEstado(orden.id_orden, v)}
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
    </div>
  );
}
