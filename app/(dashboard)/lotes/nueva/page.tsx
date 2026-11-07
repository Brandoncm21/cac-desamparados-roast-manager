"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoteForm } from "@/components/lotes/lote-form";

export default function NuevoLotePage() {
  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-4">
        <Link href="/lotes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nuevo Lote de Café</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Formulario de lote</CardTitle>
        </CardHeader>
        <CardContent>
          <LoteForm />
        </CardContent>
      </Card>
    </div>
  );
}
