import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { resolverEstado, type FamiliaEstados } from "@/lib/estados";

interface EstadoBadgeProps {
  estado: string | null | undefined;
  /** Dominio del estado: define el mapa de etiquetas y colores. */
  familia?: FamiliaEstados;
  className?: string;
}

/**
 * Badge de estado de dominio.
 *
 * Reemplaza los `estadoBadge()` que cada página duplicaba con su propio mapa.
 */
export function EstadoBadge({ estado, familia = "orden", className }: EstadoBadgeProps) {
  const { label, className: clasesEstado } = resolverEstado(estado, familia);

  if (!label) return null;

  return <Badge className={cn(clasesEstado, className)}>{label}</Badge>;
}
