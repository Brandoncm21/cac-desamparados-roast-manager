"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Mountain, Pencil, Trash2, Boxes } from "lucide-react";
import { toast } from "sonner";
import { eliminarFinca } from "@/lib/fincas";

interface LoteDeFinca {
  id_lote: number;
  nlote: string;
  enproceso: string | null;
  fecha_acopio: string | null;
  disponible: number | null;
}

interface FincaDetalle {
  id_finca: number;
  cliente_id: number;
  nombre: string;
  altura: number | null;
  ubicacion: string | null;
  zona_id: number | null;
  zonas_finca?: { nombre: string } | null;
  clientes?: { nombre_completo: string } | null;
  lotes: LoteDeFinca[];
  ordenes_count: number;
  tiene_dependencias: boolean;
}

export default function FincaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [finca, setFinca] = useState<FincaDetalle | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const puedeEditar = userRole === "Admin" || userRole === "Recepción";

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  useEffect(() => {
    fetch(`/api/fincas/${params.id}`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.data) setNoEncontrada(true);
        else setFinca(result.data);
      })
      .catch(() => setNoEncontrada(true));
  }, [params.id]);

  const eliminar = async () => {
    if (!finca) return;
    if (!window.confirm(`¿Eliminar la finca "${finca.nombre}"?`)) return;
    try {
      await eliminarFinca(finca.id_finca);
      toast.success("Finca eliminada");
      router.push("/fincas");
    } catch (e) {
      toast.error("No se pudo eliminar: " + (e instanceof Error ? e.message : ""));
    }
  };

  if (noEncontrada) {
    return <div className="text-muted-foreground mt-6">Finca no encontrada.</div>;
  }
  if (!finca) {
    return <div className="text-muted-foreground mt-6">Cargando finca…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-3">
          <Link href="/fincas">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{finca.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {finca.clientes?.nombre_completo ?? "Sin productor"}
              {finca.zonas_finca?.nombre ? ` · ${finca.zonas_finca.nombre}` : ""}
            </p>
          </div>
        </div>
        {puedeEditar && (
          <div className="flex gap-2">
            <Link href={`/fincas/${finca.id_finca}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button variant="ghost" onClick={eliminar} disabled={finca.tiene_dependencias}>
              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos de la finca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Productor</span>
              <Link href={`/clientes/${finca.cliente_id}`} className="font-medium hover:underline">
                {finca.clientes?.nombre_completo ?? "-"}
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Zona</span>
              <span>{finca.zonas_finca?.nombre ?? "Sin zona"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Altura</span>
              <span className="inline-flex items-center gap-1">
                <Mountain className="h-4 w-4 text-muted-foreground" />
                {finca.altura != null ? `${finca.altura} msnm` : "Sin registrar"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Ubicación</span>
              <span className="text-right inline-flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {finca.ubicacion || "Sin registrar"}
              </span>
            </div>
            {finca.tiene_dependencias && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                No se puede eliminar ni cambiar de productor: tiene {finca.lotes.length} lote(s) y{" "}
                {finca.ordenes_count} orden(es) asociados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Lotes</p>
              <p className="text-2xl font-bold">{finca.lotes.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Órdenes</p>
              <p className="text-2xl font-bold">{finca.ordenes_count}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Boxes className="h-4 w-4" /> Lotes de esta finca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Acopio</TableHead>
                  <TableHead className="text-right">Disponible (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finca.lotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Esta finca todavía no tiene lotes.
                    </TableCell>
                  </TableRow>
                )}
                {finca.lotes.map((l) => (
                  <TableRow key={l.id_lote}>
                    <TableCell>
                      <Link href={`/lotes/${l.id_lote}`} className="font-mono hover:underline">
                        {l.nlote}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.enproceso ?? "No"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {l.fecha_acopio ? new Date(l.fecha_acopio).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">{l.disponible ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
