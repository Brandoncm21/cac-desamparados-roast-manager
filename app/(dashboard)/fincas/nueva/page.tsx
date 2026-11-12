"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FincaForm } from "@/components/fincas/finca-form";

export default function NuevaFincaPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Link href="/fincas">
          <Button variant="ghost" size="icon" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nueva Finca</h1>
          <p className="text-sm text-muted-foreground">
            Registrá la finca de un productor. Queda disponible al crear lotes y órdenes.
          </p>
        </div>
      </div>

      <FincaForm />
    </div>
  );
}
