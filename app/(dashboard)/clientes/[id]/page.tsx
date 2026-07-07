"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole, canEditClient, canDeleteClient } from "@/lib/auth-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface OrdenResumen {
  id_orden: number;
  numero_factura: string;
  fecha_orden: string;
  estado_orden: string;
}

interface Cliente {
  id_cliente: number;
  nombre_completo: string;
  telefono: string | null;
  zona_procedencia: string | null;
  historial_ordenes: OrdenResumen[];
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [userRole, setUserRole] = useState<"Admin" | "Tostador" | "Recepción" | "Operador" | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*, ordenes_trabajo(id_orden, numero_factura, fecha_orden, estado_orden)")
        .eq("id_cliente", Number(params.id))
        .is("deleted_at", null)
        .single();

      if (data) {
        setCliente({
          ...data,
          historial_ordenes: (data.ordenes_trabajo as OrdenResumen[]) || [],
        } as Cliente);
      }
    };
    load();
  }, [params.id, supabase]);

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  const handleEliminar = async () => {
    if (!window.confirm("¿Está seguro de que desea eliminar este cliente?")) return;

    const res = await fetch(`/api/clientes/${params.id}`, { method: "DELETE" });
    const result = (await res.json()) as { data?: { deleted: boolean }; error?: { message: string } };

    if (!res.ok) {
      toast.error("Error al eliminar cliente: " + (result.error?.message || "Error desconocido"));
      return;
    }

    toast.success("Cliente eliminado exitosamente");
    router.push("/clientes");
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

  if (!cliente) return <p>Cargando...</p>;

  const pendientes = cliente.historial_ordenes.filter((o) => o.estado_orden !== "Completado" && o.estado_orden !== "Cancelado");
  const completadas = cliente.historial_ordenes.filter((o) => o.estado_orden === "Completado" || o.estado_orden === "Cancelado");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold break-words">{cliente.nombre_completo}</h1>
        <div className="ml-auto flex items-center gap-2">
          {canEditClient(userRole) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/clientes/${params.id}/editar`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {canDeleteClient(userRole) && (
            <Button variant="destructive" size="sm" onClick={handleEliminar}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-2 text-sm">
          {cliente.telefono && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {cliente.telefono}
            </p>
          )}
          {cliente.zona_procedencia && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {cliente.zona_procedencia}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="pendientes">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes" className="whitespace-nowrap">
            Pendientes ({pendientes.length})
          </TabsTrigger>
          <TabsTrigger value="completadas" className="whitespace-nowrap">
            Completadas ({completadas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="mt-4">
          <OrdenesTab ordenes={pendientes} estadoBadge={estadoBadge} />
        </TabsContent>
        <TabsContent value="completadas" className="mt-4">
          <OrdenesTab ordenes={completadas} estadoBadge={estadoBadge} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrdenesTab({
  ordenes,
  estadoBadge,
}: {
  ordenes: OrdenResumen[];
  estadoBadge: (estado: string) => string;
}) {
  if (ordenes.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hay órdenes en esta categoría.</p>;
  }

  return (
      <Card>
      <CardContent className="p-0">
        <Table className="min-w-[600px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">N° Factura</TableHead>
              <TableHead className="min-w-[120px]">Fecha</TableHead>
              <TableHead className="min-w-[140px]">Estado</TableHead>
              <TableHead className="min-w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.map((o) => (
              <TableRow key={o.id_orden}>
                <TableCell className="font-mono break-all min-w-[160px]">
                  {o.numero_factura}
                </TableCell>
                <TableCell className="break-words min-w-[120px]">{o.fecha_orden}</TableCell>
                <TableCell className="min-w-[140px]">
                  <Badge className={estadoBadge(o.estado_orden)}>{o.estado_orden}</Badge>
                </TableCell>
                <TableCell className="min-w-[80px]">
                  <Link href={`/ordenes/${o.id_orden}`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
