"use client";

import { CatacionForm } from "@/components/cataciones/catacion-form";

export default function NuevaCatacionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mt-6">Nueva Catación</h1>
      <CatacionForm />
    </div>
  );
}
