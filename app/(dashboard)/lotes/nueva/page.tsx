"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoteForm } from "@/components/lotes/lote-form";

interface LoteReciente {
  id_lote: number;
  nlote: string;
  nproductor: string;
  nfinca: string;
  enproceso: string;
  fecha_acopio: string;
}

export default function NuevoLotePage() {
  const [recientes, setRecientes] = useState<LoteReciente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/lotes?pageSize=5");
        const result = await res.json();
        setRecientes(res.ok ? (result.data ?? []) : []);
      } finally {
        setCargando(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-4">
        <Link href="/lotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nuevo Lote de Café — Acopio y Entrada de Cosecha</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Formulario de lote</CardTitle>
        </CardHeader>
        <CardContent>
          <LoteForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Recientes en Área de Acopio</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <p className="text-sm text-muted-foreground">Cargando lotes recientes...</p>
          ) : recientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay lotes registrados — este será el primero.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {recientes.map((l) => (
                <li key={l.id_lote} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <Link href={`/lotes/${l.id_lote}`} className="font-mono underline">
                    {l.nlote}
                  </Link>
                  <span className="text-muted-foreground">
                    {l.nproductor} — {l.nfinca}
                  </span>
                  <Badge variant="outline">{l.enproceso}</Badge>
                  <span className="ml-auto text-muted-foreground text-xs">
                    {new Date(l.fecha_acopio).toLocaleString("es-CR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
