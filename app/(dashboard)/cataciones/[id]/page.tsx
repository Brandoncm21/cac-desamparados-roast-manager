"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge } from "@/components/ui/estado-badge";
import { obtenerCatacion, type Catacion } from "@/lib/api/cataciones";

export default function CatacionDetallePage() {
  const params = useParams<{ id: string }>();
  const [catacion, setCatacion] = useState<Catacion | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    obtenerCatacion(Number(params.id))
      .then(setCatacion)
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return <div className="text-muted-foreground mt-6">Catación no encontrada.</div>;
  }
  if (!catacion) {
    return <div className="text-muted-foreground mt-6">Cargando catación…</div>;
  }

  const lote = catacion.lotes_cafe;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Catación — {lote?.nlote ?? `#${catacion.id_catacion_tueste}`}</h1>
        <Link href={`/cataciones/${catacion.id_catacion_tueste}/editar`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lote</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Número de lote</p>
            <p className="font-mono font-medium">{lote?.nlote ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Etapa</p>
            <EstadoBadge estado={lote?.enproceso} familia="lote" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Productor</p>
            <p className="font-medium">{lote?.clientes?.nombre_completo ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Finca</p>
            <p className="font-medium">
              {lote?.fincas?.nombre ?? "—"}
              {lote?.fincas?.altura != null ? ` (${lote.fincas.altura} msnm)` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de catación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Catado:</span>
            {catacion.catado ? (
              <Badge className="bg-green-100 text-green-800">Sí</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">No</Badge>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Notas de catación</p>
            <p className="whitespace-pre-wrap font-medium">
              {catacion.notas_catacion || "Sin notas registradas."}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Última actualización</p>
            <p className="font-medium">
              {new Date(catacion.updated_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
