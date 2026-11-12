"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FincaForm } from "@/components/fincas/finca-form";
import type { FincaOpcion } from "@/lib/fincas";

interface FincaCargada extends FincaOpcion {
  tiene_dependencias?: boolean;
}

export default function EditarFincaPage() {
  const params = useParams<{ id: string }>();
  const [finca, setFinca] = useState<FincaCargada | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);

  useEffect(() => {
    fetch(`/api/fincas/${params.id}`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.data) setNoEncontrada(true);
        else setFinca(result.data);
      })
      .catch(() => setNoEncontrada(true));
  }, [params.id]);

  if (noEncontrada) {
    return <div className="text-muted-foreground mt-6">Finca no encontrada.</div>;
  }
  if (!finca) {
    return <div className="text-muted-foreground mt-6">Cargando finca…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Link href={`/fincas/${finca.id_finca}`}>
          <Button variant="ghost" size="icon" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar finca</h1>
          <p className="text-sm text-muted-foreground">{finca.nombre}</p>
        </div>
      </div>

      <FincaForm finca={finca} clienteBloqueado={Boolean(finca.tiene_dependencias)} />
    </div>
  );
}
