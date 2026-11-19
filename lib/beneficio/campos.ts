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
  bodegaje: "Reposo, humedad, densidad y condiciones ambientales.",
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
  humedadDensidad: "Humedad y densidad",
  ambiente: "Condiciones ambientales",
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
    numero(`${prefijo}_${n}`, `${prefijo === "semimadura" ? "Semimadura" : prefijo === "madura" ? "Madura" : "Sobremadura"} ${n}`, S.brix, {
      step: "0.01",
    })
  );

export const CAMPOS_ETAPA: Record<EtapaNombre, CampoEtapa[]> = {
  caracterizacion: [
    { key: "fecha_hora", label: "Fecha y hora", tipo: "fechaHora", seccion: S.muestra },
    { key: "proceso", label: "Proceso", tipo: "texto", seccion: S.muestra },
    { key: "escala_maduracion", label: "Escala de maduración", tipo: "texto", seccion: S.muestra },
    { key: "rango_optimo_madurez", label: "Rango óptimo de madurez", tipo: "texto", seccion: S.muestra },
    numero("muestreo_tabla", "Muestreo (tabla)", S.muestra, { min: 0 }),
    numero("cerezas_verdes", "Cerezas verdes", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_semimaduras", "Cerezas semimaduras", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_en_objetivo", "Cerezas en objetivo", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_sobremaduras", "Cerezas sobremaduras", S.conteo, { min: 0, step: "1" }),
    numero("cerezas_secas", "Cerezas secas", S.conteo, { min: 0, step: "1" }),
    ...rango("semimadura", 1, 5),
    numero("semimadura_bx_promedio", "Promedio semimadura (°Bx)", S.brix, { step: "0.01" }),
    ...rango("madura", 1, 5),
    numero("madura_bx_promedio", "Promedio madura (°Bx)", S.brix, { step: "0.01" }),
    ...rango("sobremadura", 1, 5),
    numero("sobremadura_bx_promedio", "Promedio sobremadura (°Bx)", S.brix, { step: "0.01" }),
    porcentaje("pct_verdes_muestra", "Verdes", S.distribucion),
    porcentaje("pct_debajo_objetivo_muestra", "Debajo del objetivo", S.distribucion),
    porcentaje("pct_objetivo_muestra", "En objetivo", S.distribucion),
    porcentaje("pct_encima_objetivo_muestra", "Encima del objetivo", S.distribucion),
    porcentaje("pct_secas_muestra", "Secas", S.distribucion),
    numero("g_vanos", "Vanos", S.defectos, { step: "0.01" }),
    numero("g_secos", "Secos", S.defectos, { step: "0.01" }),
    numero("g_broca", "Broca", S.defectos, { step: "0.01" }),
    numero("densidad_g_ml", "Densidad (g/ml)", S.fisico, { step: "0.001" }),
    {
      key: "observaciones_aspecto_textura",
      label: "Observaciones de aspecto y textura",
      tipo: "textarea",
      seccion: S.fisico,
    },
  ],

  secado: [
    { key: "tiempo_secado", label: "Tiempo de secado", tipo: "texto", seccion: S.programa },
    { key: "fecha_inicio_secado", label: "Inicio", tipo: "fecha", seccion: S.programa },
    {
      key: "fecha_finalizacion_secado",
      label: "Finalización",
      tipo: "fecha",
      seccion: S.programa,
    },
    numero("dias_secado", "Días de secado", S.programa, { min: 0, step: "1" }),
    { key: "numero_cama", label: "Número de cama", tipo: "texto", seccion: S.programa },
    porcentaje("porcentaje_solar", "Solar", S.programa),
    porcentaje("porcentaje_mecanico", "Mecánico", S.programa),
    numero("humedad_1", "Lectura 1", S.humedadSecado, { step: "0.01" }),
    numero("humedad_2", "Lectura 2", S.humedadSecado, { step: "0.01" }),
    numero("humedad_3", "Lectura 3", S.humedadSecado, { step: "0.01" }),
    numero("humedad_4", "Lectura 4", S.humedadSecado, { step: "0.01" }),
    numero("humedad_5", "Lectura 5", S.humedadSecado, { step: "0.01" }),
    numero("humedad_6", "Lectura 6", S.humedadSecado, { step: "0.01" }),
    numero("tem_1", "Lectura 1", S.temperatura, { step: "0.1" }),
    numero("tem_2", "Lectura 2", S.temperatura, { step: "0.1" }),
    numero("tem_3", "Lectura 3", S.temperatura, { step: "0.1" }),
    numero("tem_4", "Lectura 4", S.temperatura, { step: "0.1" }),
    numero("tem_5", "Lectura 5", S.temperatura, { step: "0.1" }),
    numero("tem_6", "Lectura 6", S.temperatura, { step: "0.1" }),
    numero("peso_inicial", "Peso inicial", S.pesos, { step: "0.01", min: 0 }),
    numero("peso_final", "Peso final", S.pesos, { step: "0.01", min: 0 }),
  ],

  bodegaje: [
    { key: "inicio_reposo", label: "Inicio del reposo", tipo: "fecha", seccion: S.ingreso },
    numero("cantidad_sacos", "Cantidad de sacos", S.ingreso, { min: 0, step: "1" }),
    numero("peso_pergamino", "Peso pergamino", S.ingreso, { step: "0.01", min: 0 }),
    numero("peso_bellota", "Peso bellota", S.ingreso, { step: "0.01", min: 0 }),
    numero("humedad_inicial", "Humedad inicial", S.humedadDensidad, { step: "0.01" }),
    numero("humedad_final", "Humedad final", S.humedadDensidad, { step: "0.01" }),
    numero("densidad_pergamino", "Densidad pergamino", S.humedadDensidad, { step: "0.001" }),
    numero("densidad_bellota", "Densidad bellota", S.humedadDensidad, { step: "0.001" }),
    porcentaje("lectura_humedad_relativa", "Humedad relativa", S.ambiente),
    numero("lectura_temperatura_interna", "Temperatura interna", S.ambiente, {
      unidad: "°C",
      step: "0.1",
    }),
    numero("lectura_temperatura_externa", "Temperatura externa", S.ambiente, {
      unidad: "°C",
      step: "0.1",
    }),
  ],

  trilla: [
    { key: "fecha_final_reposo", label: "Fin del reposo", tipo: "fecha", seccion: S.rendimiento },
    porcentaje("rendimiento_teorico_pelado", "Rendimiento teórico pelado", S.rendimiento),
    porcentaje(
      "rendimiento_teorico_seleccion",
      "Rendimiento teórico selección",
      S.rendimiento
    ),
    porcentaje("rendimiento_final_pelado", "Rendimiento final pelado", S.rendimiento),
    porcentaje("rendimiento_final_seleccion", "Rendimiento final selección", S.rendimiento),
    numero("peso_en_verde_teorico", "Peso en verde teórico", S.verde, {
      step: "0.01",
      min: 0,
    }),
    numero("peso_verde_final", "Peso en verde final", S.verde, {
      step: "0.01",
      min: 0,
      requerido: true,
      ayuda: "Obligatorio para cerrar la trilla.",
    }),
    numero("peso_verde_inferiores", "Peso verde inferiores", S.verde, {
      step: "0.01",
      min: 0,
    }),
    numero("humedad_inicial_pergamino_bellota", "Humedad inicial", S.humedad, {
      step: "0.01",
    }),
    numero("humedad_final_verde", "Humedad final verde", S.humedad, { step: "0.01" }),
    porcentaje("porcentaje_primera", "Primera", S.clasificacion),
    porcentaje("porcentaje_madres", "Madres", S.clasificacion),
    porcentaje("porcentaje_caracolillo", "Caracolillo", S.clasificacion),
    porcentaje("porcentaje_menudos", "Menudos", S.clasificacion),
    porcentaje("porcentaje_cataduras", "Cataduras", S.clasificacion),
    porcentaje("porcentaje_segundas", "Segundas", S.clasificacion),
    porcentaje("porcentaje_barreduras", "Barreduras", S.clasificacion),
    porcentaje("porcentaje_escogeduras", "Escogeduras", S.clasificacion),
    porcentaje("porcentaje_otras_inferiores", "Otras inferiores", S.clasificacion),
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
