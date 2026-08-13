"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PrecioServicio {
  precio_por_kg: number;
  valid_from: string;
  valid_to: string | null;
}

interface ServicioMaestro {
  id_servicio_maestro: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  default_peso_kg: number | null;
  activo: boolean;
  servicio_precios: PrecioServicio[];
}

function precioVigente(servicio: ServicioMaestro): number | null {
  const vigentes = (servicio.servicio_precios || []).filter((p) => !p.valid_to);
  if (vigentes.length === 0) return null;
  return vigentes[0]?.precio_por_kg ?? null;
}

export default function AdminServiciosPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [servicios, setServicios] = useState<ServicioMaestro[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("servicios_maestro")
        .select(`
          *,
          servicio_precios(precio_por_kg, valid_from, valid_to)
        `)
        .order("nombre");

      if (error) {
        toast.error("Error al cargar servicios: " + error.message);
      } else {
        setServicios(data as unknown as ServicioMaestro[]);
      }
      setLoading(false);
    };
    load();
  }, [supabase]);

  const filtrados = servicios.filter(
    (s) =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.codigo.toLowerCase().includes(search.toLowerCase())
  );

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
          placeholder="Buscar por nombre o código..."
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
          ) : filtrados.length === 0 ? (
            <p className="text-muted-foreground">No hay servicios registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Peso default (kg)</TableHead>
                  <TableHead className="text-right">Precio/kg (₡)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((s) => (
                  <TableRow key={s.id_servicio_maestro}>
                    <TableCell className="font-mono text-xs">{s.codigo}</TableCell>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell>{s.default_peso_kg ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {precioVigente(s) != null ? `₡${Number(precioVigente(s)).toLocaleString()}` : <Badge variant="outline">Sin precio</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? "completado" : "cancelado"}>
                        {s.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/servicios/${s.id_servicio_maestro}/editar`)}>
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
    </div>
  );
}
