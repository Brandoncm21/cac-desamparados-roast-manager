export interface CampoPruebaRecibido {
  key: string;
  label: string;
  tipo: "porcentaje" | "densidad";
  unidad?: string;
}

export const CAMPOS_PRUEBAS_FISICAS: CampoPruebaRecibido[] = [
  { key: "porcentaje_flote", label: "Flote", tipo: "porcentaje" },
  { key: "porcentaje_broca", label: "Broca", tipo: "porcentaje" },
  { key: "porcentaje_vano", label: "Vano", tipo: "porcentaje" },
  { key: "porcentaje_verde", label: "Verde", tipo: "porcentaje" },
  { key: "porcentaje_secos", label: "Secos", tipo: "porcentaje" },
];

export const CAMPOS_BENEFICIADO_HUMEDO: CampoPruebaRecibido[] = [
  { key: "porcentaje_segundas", label: "Segundas", tipo: "porcentaje" },
  { key: "porcentaje_danos_mecanicos", label: "Daños mecánicos", tipo: "porcentaje" },
  { key: "porcentaje_pulpa_pergamino", label: "Pulpa pergamino", tipo: "porcentaje" },
  { key: "porcentaje_pergamino_pulpa", label: "Pergamino en pulpa", tipo: "porcentaje" },
];

export const CAMPOS_DENSIDAD: CampoPruebaRecibido[] = [
  { key: "densidad_fruta", label: "Densidad de fruta", tipo: "densidad", unidad: "g/mL" },
  { key: "densidad_pergamino_humedo", label: "Densidad de pergamino húmedo", tipo: "densidad", unidad: "g/mL" },
];

export const CAMPOS_LIMPIEZA: CampoPruebaRecibido[] = [
  { key: "porcentaje_puro", label: "Puro", tipo: "porcentaje" },
  { key: "porcentaje_impuro", label: "Impuro", tipo: "porcentaje" },
  { key: "porcentaje_limpio", label: "Limpio", tipo: "porcentaje" },
  { key: "porcentaje_sucio", label: "Sucio", tipo: "porcentaje" },
];

export const CAMPOS_OPCIONALES_RECIBIDO: CampoPruebaRecibido[] = [
  ...CAMPOS_PRUEBAS_FISICAS,
  ...CAMPOS_BENEFICIADO_HUMEDO,
  ...CAMPOS_DENSIDAD,
  ...CAMPOS_LIMPIEZA,
];
