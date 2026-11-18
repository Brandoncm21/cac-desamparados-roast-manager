"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecibidoLote } from "@/lib/api/beneficio";

interface SeccionLotesProps {
  lotes: RecibidoLote[];
  seleccionados: number[];
  onAlternar: (idLote: number, activo: boolean) => void;
}

/** Lotes recibidos que se pueden enlazar a la orden (opcional). */
export function SeccionLotes({ lotes, seleccionados, onAlternar }: SeccionLotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Lotes a procesar (opcional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay lotes recibidos.</p>
        ) : (
          <div className="max-h-56 overflow-auto rounded-md border divide-y">
            {lotes.map((lote) => {
              const marcado = seleccionados.includes(lote.id_lote);
              return (
                <label
                  key={lote.id_lote}
                  className="flex items-center gap-3 p-2 text-sm cursor-pointer hover:bg-zinc-50"
                >
                  <Checkbox
                    checked={marcado}
                    onCheckedChange={(valor) => onAlternar(lote.id_lote, Boolean(valor))}
                  />
                  <span className="font-mono">{lote.numero_lote}</span>
                  <span className="text-muted-foreground">
                    {lote.productores?.nombre_completo ?? "-"} · {lote.fincas?.nombre ?? "-"}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
