/** Acceso a `/api/perfiles-tueste`. */

import { leerJson } from "./http";

export interface CrearPerfilTuesteInput {
  id_orden: number;
  nombre_cafe: string;
  lote_ids?: number[];
}

export interface LotePerfilTueste {
  id_lote: number;
  numero_lote: string;
  enproceso: string;
  estado_lote?: string | null;
  productores?: { nombre_completo: string } | null;
  fincas?: { nombre: string } | null;
}

export interface PerfilTuesteCreado {
  id_perfil: number;
  perfil: { id_perfil: number } & Record<string, unknown>;
  lotes: LotePerfilTueste[];
}

export async function crearPerfilTueste(
  input: CrearPerfilTuesteInput
): Promise<PerfilTuesteCreado> {
  const res = await fetch("/api/perfiles-tueste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return leerJson<PerfilTuesteCreado>(res);
}
