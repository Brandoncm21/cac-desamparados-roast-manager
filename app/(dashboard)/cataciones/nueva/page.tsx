import { CatacionForm } from "@/components/cataciones/catacion-form";

export default async function NuevaCatacionPage({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>;
}) {
  const { lote } = await searchParams;
  const loteId = Number(lote);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mt-6">Nueva Catación</h1>
      <CatacionForm loteId={Number.isInteger(loteId) && loteId > 0 ? loteId : undefined} />
    </div>
  );
}
