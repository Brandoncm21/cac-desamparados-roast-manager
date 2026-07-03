"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Thermometer } from "lucide-react";
import Link from "next/link";

export default function OrdenDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orden, setOrden] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("ordenes_trabajo")
        .select("*, clientes(*), servicios_ejecutados(*), especificaciones_orden(*)")
        .eq("id_orden", Number(params.id))
        .single();
      if (data) setOrden(data);
    };
    load();
  }, [params.id, supabase]);

  if (!orden) return <p>Cargando...</p>;

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      "En Proceso": "bg-blue-100 text-blue-800",
      Completado: "bg-green-100 text-green-800",
      Cancelado: "bg-red-100 text-red-800",
    };
    return colors[estado] || "bg-gray-100 text-gray-800";
  };

  const cliente = orden.clientes as Record<string, unknown> | null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Orden #{orden.num_talonario_fisico as string}</h1>
        <Badge className={estadoBadge(orden.estado_orden as string)}>
          {orden.estado_orden as string}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{cliente?.nombre_completo as string}</p>
            <p className="text-muted-foreground">{cliente?.telefono as string}</p>
            <p className="text-muted-foreground">{cliente?.zona_procedencia as string}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Detalles</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Proceso: <span className="font-medium">{orden.proceso_cafe as string}</span></p>
            <p>Humedad: <span className="font-medium">{orden.porcentaje_humedad_entrada as string}%</span></p>
            <p>Factura: <span className="font-medium">{orden.num_factura as string || "-"}</span></p>
            <p>Fecha: <span className="font-medium">{orden.fecha_orden as string}</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Servicios</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Peso Inicial</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orden.servicios_ejecutados as Array<Record<string, unknown>>)?.map((s: any) => (
                <TableRow key={s.id_servicio}>
                  <TableCell className="font-medium">{s.tipo_servicio}</TableCell>
                  <TableCell>{s.peso_inicial ? `${s.peso_inicial} kg` : "-"}</TableCell>
                  <TableCell>{s.precio ? `₡${Number(s.precio).toLocaleString()}` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(orden.especificaciones_orden as Record<string, unknown>) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Especificaciones</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Tueste: {((orden.especificaciones_orden as any)?.tipo_tueste) || "-"}</p>
            <p>Molienda: {((orden.especificaciones_orden as any)?.tipo_molienda) || "-"}</p>
            <p>Empaque: {((orden.especificaciones_orden as any)?.tipo_empaque) || "-"}</p>
            <p>Observaciones: {((orden.especificaciones_orden as any)?.observaciones) || "-"}</p>
          </CardContent>
        </Card>
      )}

      <Link href={`/tueste?orden=${params.id}`}>
        <Button variant="outline" className="w-full h-12">
          <Thermometer className="h-4 w-4 mr-2" />
          Ver Perfiles de Tueste Vinculados
        </Button>
      </Link>
    </div>
  );
}
