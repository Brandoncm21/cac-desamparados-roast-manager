"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

interface CatacionDetalle {
  id_catacion_tueste: number;
  id_lote: number | null;
  nlote: string | null;
  ffreposo: string | null;
  pfinales: number | null;
  limpio: number | null;
  rtostado: number | null;
  dfueste: number | null;
  quaker: number | null;
  c1agrio: number | null;
  c1hongos: number | null;
  c1cerezaseca: number | null;
  c1negro: number | null;
  c1insectos: number | null;
  c1me: number | null;
  c2flotador: number | null;
  c2averanado: number | null;
  c2pergamino: number | null;
  c2inmaduro: number | null;
  c2concha: number | null;
  c2insectos: number | null;
  c2cascara: number | null;
  c2pulpa: number | null;
  c2partido: number | null;
  c2cortado: number | null;
  c2mordido: number | null;
  c2negrop: number | null;
  c2agriop: number | null;
  productos: number | null;  perfiles_tueste: {
    id_orden: number | null;
    numero_lote: string | null;
    nombre_cafe: string | null;
    estado: string;
  } | null;
  rondas: { id: number; valor_calidad: number | null }[];
}

const fmt = (n: number | null) => (n == null ? "-" : String(n));

export default function CatacionDetallePage() {
  const params = useParams<{ id: string }>();
  const [catacion, setCatacion] = useState<CatacionDetalle | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/cataciones/${params.id}`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.data) setNotFound(true);
        else setCatacion(result.data);
      });
  }, [params.id]);

  if (notFound) {
    return <div className="text-muted-foreground mt-6">Catación no encontrada.</div>;
  }
  if (!catacion) {
    return <div className="text-muted-foreground mt-6">Cargando catación…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">
          Catación — {catacion.perfiles_tueste?.numero_lote || catacion.perfiles_tueste?.nombre_cafe || `#${catacion.id_catacion_tueste}`}
        </h1>
        <Link href={`/cataciones/${catacion.id_catacion_tueste}/editar`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identidad & Perfil (e2)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Perfil:</span>{" "}
              {catacion.perfiles_tueste?.numero_lote || "-"}
            </div>
            <div>
              <span className="text-muted-foreground">Orden:</span>{" "}
              {catacion.perfiles_tueste?.id_orden ?? "-"}
              {" "}
              <Badge variant="secondary">{catacion.perfiles_tueste?.estado ?? "-"}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Lote:</span>{" "}
              <span className="font-mono">{catacion.nlote || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Reposo:</span>{" "}
              {catacion.ffreposo ? new Date(catacion.ffreposo).toLocaleDateString() : "-"}
            </div>
            <div>
              <span className="text-muted-foreground">Puntaje Final:</span>
              <span className="ml-1 text-lg font-semibold">{fmt(catacion.pfinales)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Rendimiento:</span>{" "}
              {fmt(catacion.rtostado)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rondas (valor_calidad)</CardTitle>
          </CardHeader>
          <CardContent>
            {catacion.rondas.length === 0 && (
              <p className="text-muted-foreground text-sm">Sin rondas registradas.</p>
            )}
            <ul className="space-y-2 text-sm">
              {catacion.rondas.map((r, i) => (
                <li key={r.id} className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Ronda {i + 1}</span>
                  <span className="font-semibold">{fmt(r.valor_calidad)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Defectos Verdes (C1 / C2)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          {[
            ["C1 Agrio", catacion.c1agrio], ["C1 Hongos", catacion.c1hongos],
            ["C1 C. Seca", catacion.c1cerezaseca], ["C1 Negro", catacion.c1negro],
            ["C1 Insectos", catacion.c1insectos], ["C1 M.E.", catacion.c1me],
            ["C2 Flotador", catacion.c2flotador], ["C2 Averanado", catacion.c2averanado],
            ["C2 Pergamino", catacion.c2pergamino], ["C2 Inmaduro", catacion.c2inmaduro],
            ["C2 Concha", catacion.c2concha], ["C2 Insectos", catacion.c2insectos],
            ["C2 Cáscara", catacion.c2cascara], ["C2 Pulpa", catacion.c2pulpa],
            ["C2 Partido", catacion.c2partido], ["C2 Cortado", catacion.c2cortado],
            ["C2 Mordido", catacion.c2mordido], ["C2 N. Perg.", catacion.c2negrop],
            ["C2 A. Perg.", catacion.c2agriop],             ["Quakers", catacion.quaker], ["Densidad g/ml", catacion.dfueste],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold">{fmt(val as number | null)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
