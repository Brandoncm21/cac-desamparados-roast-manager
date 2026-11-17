/** Acceso a `/api/perfiles-tueste`. */

import { leerJson } from "./http";

export interface CrearPerfilTuesteInput {
  id_orden: number;
  nombre_cafe: string;
}

export interface PerfilTuesteCreado {
  id_perfil: number;
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
