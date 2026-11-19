/**
 * Especificación declarativa de los campos de cada etapa del beneficio.
 *
 * La UI de etapas se genera a partir de esta lista: agregar un campo es tocar
 * aquí (y el esquema Zod), no un formulario nuevo por etapa.
 */

export type TipoCampo =
  | "texto"
  | "numero"
  | "fecha"
  | "fechaHora"
  | "textarea"
  | "booleano";

export interface CampoEtapa {
  key: string;
  label: string;
  tipo: TipoCampo;
  seccion: string;
  unidad?: string;
  step?: string;
  min?: number;
  max?: number;
  requerido?: boolean;
  ayuda?: string;
}

export type EtapaNombre =
  | "caracterizacion"
  | "secado"
  | "bodegaje"
  | "trilla"
  | "catacion"
  | "calificacion";

export const TITULO_ETAPA: Record<EtapaNombre, string> = {
  caracterizacion: "Caracterización de la materia prima",
  secado: "Secado",
  bodegaje: "Bodegaje",
  trilla: "Trilla",
  catacion: "Catación",
  calificacion: "Calificación de café arábiga",
};

export const DESCRIPCION_ETAPA: Record<EtapaNombre, string> = {
  caracterizacion:
    "Muestreo de maduración, °Bx por grado y defectos del café recibido.",
  secado: "Programa, curvas de humedad/temperatura y control de pesos.",
  bodegaje: "Reposo, peso y humedad del café en bodega.",
  trilla: "Rendimientos, peso en verde y clasificación de la exportación.",
  catacion: "Resultado de taza del lote (catado sí/no y notas).",
  calificacion:
    "Evaluación final: análisis físico del café verde y puntaje sensorial del tostado.",
};

const S = {
  muestra: "Muestra",
  conteo: "Conteo de cerezas",
  brix: "°Bx por grado de madurez",
  distribucion: "Distribución de la muestra (%)",
  defectos: "Defectos (g)",
  fisico: "Físico",
  programa: "Programa de secado",
  humedadSecado: "Humedad (%)",
  temperatura: "Temperatura (°C)",
  pesos: "Pesos (kg)",
  ingreso: "Ingreso a bodega",
  rendimiento: "Reposo y rendimiento",
  verde: "Peso en verde",
  humedad: "Humedad",
  clasificacion: "Clasificación (%)",
  resultado: "Resultado",
} as const;

const numero = (
  key: string,
  label: string,
  seccion: string,
  extra: Partial<CampoEtapa> = {}
): CampoEtapa => ({ key, label, tipo: "numero", seccion, ...extra });

const porcentaje = (
  key: string,
  label: string,
  seccion: string,
  extra: Partial<CampoEtapa> = {}
): CampoEtapa => ({
  key,
  label,
  tipo: "numero",
  seccion,
  unidad: "%",
  step: "0.1",
  min: 0,
  max: 100,
  ...extra,
});

const rango = (prefijo: string, desde: number, hasta: number): CampoEtapa[] =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).map((n) =>
    numero(
      `${prefijo}_${n}`,
      `${prefijo === "semimadura" ? "Inmadura" : prefijo === "madura" ? "Madura" : "Sobremadura"} ${n}`,
      S.brix,
      { step: "0.01", unidad: "°Bx" }
    )
  );

export const CAMPOS_ETAPA: Record<EtapaNombre, CampoEtapa[]> = {
  caracterizacion: [
    { key: "fecha_hora", label: "Fecha y hora", tipo: "fechaHora", seccion: S.muestra },
    { key: "proceso", label: "Proceso", tipo: "texto", seccion: S.muestra },
    { key: "proceso_otro", label: "Proceso (especifique)", tipo: "texto", seccion: S.muestra },
    numero("cerezas_verdes", "Cerezas verdes", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_semimaduras", "Cerezas inmaduras o semimaduras", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_en_objetivo", "Cerezas en objetivo", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_sobremaduras", "Cerezas sobremaduras", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_secas", "Cerezas secas", S.conteo, { min: 0, step: "1" }),
    ...rango("semimadura", 1, 5),
    numero("semimadura_bx_promedio", "Promedio inmaduras (°Bx)", S.brix, { step: "0.01", unidad: "°Bx" }),
    ...rango("madura", 1, 5),
    numero("madura_bx_promedio", "Promedio maduras (°Bx)", S.brix, { step: "0.01", unidad: "°Bx" }),
    ...rango("sobremadura", 1, 5),
    numero("sobremadura_bx_promedio", "Promedio sobremaduras (°Bx)", S.brix, { step: "0.01", unidad: "°Bx" }),
    numero("g_vanos", "Granos vanos", S.defectos, { step: "0.01", unidad: "g" }),
    numero("g_secos", "Granos secos", S.defectos, { step: "0.01", unidad: "g" }),
    numero("g_broca", "Granos con broca", S.defectos, { step: "0.01", unidad: "g" }),
    numero("densidad_g_ml", "Densidad", S.fisico, { step: "0.001", unidad: "g/ml" }),
    {
      key: "observaciones_aspecto_textura",
      label: "Observaciones de aspecto y textura",
      tipo: "textarea",
      seccion: S.fisico,
    },
  ],

  secado: [
    { key: "fecha_inicio_secado", label: "Fecha de inicio", tipo: "fecha", seccion: S.programa },
    {
      key: "fecha_finalizacion_secado",
      label: "Fecha de finalización",
      tipo: "fecha",
      seccion: S.programa,
    },
    { key: "tiempo_secado", label: "Tiempo de secado", tipo: "texto", seccion: S.programa },
    { key: "numero_cama", label: "Número de cama", tipo: "texto", seccion: S.programa },
    porcentaje("porcentaje_solar", "Solar", S.programa),
    porcentaje("porcentaje_mecanico", "Mecánico", S.programa),
    numero("humedad_1", "Humedad 1", S.humedadSecado, { step: "0.01", unidad: "%" }),
    numero("humedad_2", "Humedad 2", S.humedadSecado, { step: "0.01", unidad: "%" }),
    numero("humedad_3", "Humedad 3", S.humedadSecado, { step: "0.01", unidad: "%" }),
    numero("humedad_4", "Humedad 4", S.humedadSecado, { step: "0.01", unidad: "%" }),
    numero("humedad_5", "Humedad 5", S.humedadSecado, { step: "0.01", unidad: "%" }),
    numero("tem_1", "Temperatura 1", S.temperatura, { step: "0.1", unidad: "°C" }),
    numero("tem_2", "Temperatura 2", S.temperatura, { step: "0.1", unidad: "°C" }),
    numero("tem_3", "Temperatura 3", S.temperatura, { step: "0.1", unidad: "°C" }),
    numero("tem_4", "Temperatura 4", S.temperatura, { step: "0.1", unidad: "°C" }),
    numero("tem_5", "Temperatura 5", S.temperatura, { step: "0.1", unidad: "°C" }),
    numero("peso_inicial", "Peso inicial", S.pesos, { step: "0.01", min: 0, unidad: "kg" }),
    numero("peso_final", "Peso final", S.pesos, { step: "0.01", min: 0, unidad: "kg" }),
  ],

  bodegaje: [
    { key: "inicio_reposo", label: "Inicio del reposo", tipo: "fecha", seccion: S.ingreso },
    numero("cantidad_sacos", "Cantidad de sacos", S.ingreso, { min: 0, step: "1", unidad: "sacos" }),
    numero("peso_pergamino", "Peso pergamino", S.ingreso, { step: "0.01", min: 0, unidad: "kg" }),
    numero("peso_bellota", "Peso bellota", S.ingreso, { step: "0.01", min: 0, unidad: "kg" }),
    numero("humedad_inicial", "Humedad inicial", S.ingreso, { step: "0.01", unidad: "%" }),
    numero("humedad_final", "Humedad final", S.ingreso, { step: "0.01", unidad: "%" }),
  ],

  trilla: [
    { key: "fecha_final_reposo", label: "Fecha final del reposo", tipo: "fecha", seccion: S.rendimiento },
    {
      key: "pruebas_fisicas_trilla",
      label: "Pruebas físicas de la trilla",
      tipo: "textarea",
      seccion: S.rendimiento,
    },
    porcentaje("rendimiento_teorico_pelado", "Rendimiento teórico de pelado", S.rendimiento),
    porcentaje(
      "rendimiento_teorico_seleccion",
      "Rendimiento teórico de selección",
      S.rendimiento
    ),
    porcentaje("rendimiento_final_pelado", "Rendimiento final de pelado", S.rendimiento),
    porcentaje("rendimiento_final_seleccion", "Rendimiento final de selección", S.rendimiento),
    numero("peso_en_verde_teorico", "Peso verde teórico", S.verde, {
      step: "0.01",
      min: 0,
      unidad: "kg",
    }),
    numero("peso_verde_final", "Peso verde final", S.verde, {
      step: "0.01",
      min: 0,
      unidad: "kg",
    }),
    numero("humedad_inicial_pergamino_bellota", "Humedad inicial (pergamino/bellota)", S.humedad, {
      step: "0.01",
      unidad: "%",
    }),
    numero("humedad_final_verde", "Humedad final (verde)", S.humedad, {
      step: "0.01",
      unidad: "%",
    }),
    porcentaje("porcentaje_primera", "Primera", S.clasificacion),
    porcentaje("porcentaje_madres", "Madres", S.clasificacion),
    porcentaje("porcentaje_caracolillo", "Caracolillo", S.clasificacion),
    porcentaje("porcentaje_menudos", "Menudos", S.clasificacion),
    porcentaje("porcentaje_cataduras", "Cataduras", S.clasificacion),
    porcentaje("porcentaje_segundas", "Segundas", S.clasificacion),
    porcentaje("porcentaje_barreduras", "Barreduras", S.clasificacion),
    porcentaje("porcentaje_escogeduras", "Escogeduras", S.clasificacion),
    porcentaje("porcentaje_otras_inferiores", "Otras inferiores", S.clasificacion),
    numero("peso_en_verde_final", "Peso en verde final", S.verde, {
      step: "0.01",
      min: 0,
      unidad: "kg",
    }),
    numero("peso_verde_inferiores", "Peso en verde inferiores", S.verde, {
      step: "0.01",
      min: 0,
      unidad: "kg",
    }),
    numero("peso_en_verde_final_inferior", "Peso en verde final inferior", S.verde, {
      step: "0.01",
      min: 0,
      unidad: "kg",
    }),
  ],

  catacion: [
    {
      key: "catado",
      label: "Lote catado",
      tipo: "booleano",
      seccion: S.resultado,
      ayuda: "Al marcarlo, el lote pasa a Catado.",
    },
    { key: "notas_catacion", label: "Notas de catación", tipo: "textarea", seccion: S.resultado },
  ],

  calificacion: [
    // Bloque verde (análisis físico)
    numero("humedad", "Humedad", "Café verde", {
      unidad: "%",
      step: "0.01",
      min: 0,
      max: 100,
    }),
    numero("densidad", "Densidad", "Café verde", {
      unidad: "g/ml",
      step: "0.001",
      min: 0,
    }),
    numero("defectos_primarios", "Defectos primarios", "Café verde", { step: "1", min: 0 }),
    numero("defectos_secundarios", "Defectos secundarios", "Café verde", { step: "1", min: 0 }),
    porcentaje("porcentaje_verde", "% Café verde", "Café verde"),    // Bloque tostado (físico + sensorial)
    numero("puntaje_sca", "Puntaje SCA", "Café tostado", {
      step: "0.1",
      min: 0,
      max: 100,
      ayuda: "Escala 0–100. Al guardarlo, el lote pasa a Calificado.",
    }),
    numero("fragancia", "Fragancia", "Café tostado", { step: "1", min: 1, max: 10 }),
    numero("acidez", "Acidez", "Café tostado", { step: "1", min: 1, max: 10 }),
    numero("cuerpo", "Cuerpo", "Café tostado", { step: "1", min: 1, max: 10 }),
    numero("dulzor", "Dulzor", "Café tostado", { step: "1", min: 1, max: 10 }),
    numero("balance", "Balance", "Café tostado", { step: "1", min: 1, max: 10 }),
    { key: "notas", label: "Notas de calificación", tipo: "textarea", seccion: "Café tostado" },
  ],
};

/** Agrupa los campos por sección conservando el orden de la especificación. */
export function seccionesDeEtapa(etapa: EtapaNombre): { titulo: string; campos: CampoEtapa[] }[] {
  const secciones: { titulo: string; campos: CampoEtapa[] }[] = [];
  for (const campo of CAMPOS_ETAPA[etapa]) {
    const ultima = secciones[secciones.length - 1];
    if (ultima?.titulo === campo.seccion) ultima.campos.push(campo);
    else secciones.push({ titulo: campo.seccion, campos: [campo] });
  }
  return secciones;
}
