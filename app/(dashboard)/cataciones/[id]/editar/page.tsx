"use client";

import { useParams } from "next/navigation";
import { CatacionForm } from "@/components/cataciones/catacion-form";

export default function EditarCatacionPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mt-6">Editar Catación</h1>
      <CatacionForm catacionId={Number(params.id)} />
    </div>
  );
}
