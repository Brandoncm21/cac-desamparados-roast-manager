"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoteForm, type LoteActual } from "@/components/lotes/lote-form";
import { toast } from "sonner";

export default function EditarLotePage() {
  const params = useParams();
  const router = useRouter();
  const loteId = params["id"] as string;

  const [lote, setLote] = useState<LoteActual | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/lotes/${loteId}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error("Error al cargar lote: " + (result.error?.message || "Error desconocido"));
        router.push("/lotes");
        return;
      }
      const { ordenes_vinculadas: _omit, ...loteLimpio } = result.data;
      void _omit;
      setLote(loteLimpio as LoteActual);
      setCargando(false);
    };
    load();
  }, [loteId, router]);

  if (cargando || !lote) {
    return <p className="mt-6 text-muted-foreground">Cargando lote...</p>;
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-4">
        <Link href={`/lotes/${lote["id_lote"]}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Editar Lote <span className="font-mono">{lote.nlote}</span></h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Formulario de edición</CardTitle>
        </CardHeader>
        <CardContent>
          <LoteForm lote={lote} />
        </CardContent>
      </Card>
    </div>
  );
}
