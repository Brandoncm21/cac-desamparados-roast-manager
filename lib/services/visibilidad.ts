export const MOLIENDA_DEFAULT = "Grano Entero";

export interface ServicioBasico {
  nombre: string;
  tipo: string;
}

function normalizar(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tieneTipoTueste(servicios: ServicioBasico[]): boolean {
  return servicios.some(
    (s) => s.tipo === "tueste" || normalizar(s.nombre).includes("tueste")
  );
}

export function tieneTipoEmpacado(servicios: ServicioBasico[]): boolean {
  return servicios.some(
    (s) =>
      s.tipo === "empacado" ||
      normalizar(s.nombre).includes("empacado") ||
      normalizar(s.nombre).includes("empaque")
  );
}

export function tieneMolido(servicios: ServicioBasico[]): boolean {
  return servicios.some((s) => normalizar(s.nombre).includes("molido"));
}

export function tieneSecado(servicios: ServicioBasico[]): boolean {
  return servicios.some((s) => normalizar(s.nombre).includes("secado"));
}

export function requiereHumedad(servicios: ServicioBasico[]): boolean {
  return tieneTipoTueste(servicios) || tieneSecado(servicios);
}
