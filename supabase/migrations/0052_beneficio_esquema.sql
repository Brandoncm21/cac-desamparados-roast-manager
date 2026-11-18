-- 0052_beneficio_esquema.sql
-- F3 · Pivote Beneficio/Acopio: el lote nace en "Recibido de Café".
--
-- Referencias: instrucciones maestras F2-F6 (atributos por módulo, unidades),
-- convenciones del repo: RLS 3 políticas + REVOKE anon, soft-delete dirigido,
-- trigger update_updated_at(), roles get_empleado_rol().
--
-- 0. Limpieza residual de F2: en PostgreSQL DROP TABLE ... CASCADE elimina las
--    FKs dependientes, no las tablas que referencian. Estas quedaron huérfanas
--    (sin FK, con datos) y aquí se eliminan explícitamente.
--
-- Decisiones registradas:
--   · ph_miel es pH (acidez), no porcentaje: numeric(4,2).
--   · Estado principal = `enproceso` (CHECK) para compatibilidad con EstadoBadge;
--     `disponible`/`vendido` son flags independientes.
--   · `proceso` = tipo de proceso (Lavado/Honey/Natural/Otro).
--   · Zona y altura NO se duplican: se heredan de fincas (zona_id + altura).
--   · Conteos de maduración se guardan como cantidades; los % se derivan en la UI.
--   · ordenes_trabajo.id_finca se conserva; el vínculo orden↔lote es orden_lotes.

-- ── 0. Residuales de F2 ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.orden_lotes CASCADE;
DROP TABLE IF EXISTS public.catacion_tueste CASCADE;
DROP TABLE IF EXISTS public.peso_verde_trilla CASCADE;
DROP TABLE IF EXISTS public.trilla_lote CASCADE;
DROP TABLE IF EXISTS public.secado_bodega CASCADE;
DROP TABLE IF EXISTS public.bodega_lote CASCADE;
DROP TABLE IF EXISTS public.secado_humedad CASCADE;
DROP TABLE IF EXISTS public.secado_ambiente CASCADE;
DROP TABLE IF EXISTS public.secado_temperatura CASCADE;
DROP TABLE IF EXISTS public.secado_camas CASCADE;
DROP TABLE IF EXISTS public.secado_lote CASCADE;
DROP TABLE IF EXISTS public.caracterizacion_rc CASCADE;
DROP TABLE IF EXISTS public.caracterizacion_lote CASCADE;

-- ── 1. Lote: nace en Recibido de Café ───────────────────────────────────────
CREATE TABLE public.lotes_cafe (
  id_lote              serial PRIMARY KEY,
  public_id            uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_lote          varchar(100) NOT NULL,
  numero_recibo        varchar(50) NOT NULL,
  factura              varchar(50),
  productor_id         integer NOT NULL REFERENCES public.productores(id_productor) ON DELETE RESTRICT,
  finca_id             integer NOT NULL REFERENCES public.fincas(id_finca) ON DELETE RESTRICT,
  varietal             varchar(100),
  cajuelas             integer CHECK (cajuelas >= 0),
  cuartillos           integer CHECK (cuartillos >= 0),
  -- Pruebas físicas (%)
  porcentaje_flote     numeric(5,2) CHECK (porcentaje_flote BETWEEN 0 AND 100),
  porcentaje_broca     numeric(5,2) CHECK (porcentaje_broca BETWEEN 0 AND 100),
  porcentaje_vano      numeric(5,2) CHECK (porcentaje_vano BETWEEN 0 AND 100),
  porcentaje_verde     numeric(5,2) CHECK (porcentaje_verde BETWEEN 0 AND 100),
  porcentaje_secos     numeric(5,2) CHECK (porcentaje_secos BETWEEN 0 AND 100),
  -- pH de miel: acidez, no porcentaje
  ph_miel              numeric(4,2) CHECK (ph_miel BETWEEN 0 AND 14),
  -- Limpieza: true = puro / limpio
  puro_impuro          boolean NOT NULL DEFAULT true,
  limpio_sucio         boolean NOT NULL DEFAULT true,
  -- Rango de maduración (cantidades de referencia)
  rango_objetivo       integer CHECK (rango_objetivo >= 0),
  rango_sobre_objetivo integer CHECK (rango_sobre_objetivo >= 0),
  rango                integer CHECK (rango >= 0),
  -- Proceso y estado
  proceso              varchar(50) CHECK (proceso IN ('Lavado', 'Honey', 'Natural', 'Otro')),
  enproceso            varchar(50) NOT NULL DEFAULT 'Recibido'
    CHECK (enproceso IN ('Recibido', 'En Caracterización', 'En Secado', 'En Bodega', 'En Trilla', 'Catado', 'Vendido')),
  disponible           boolean NOT NULL DEFAULT true,
  vendido              boolean NOT NULL DEFAULT false,
  fecha_recibido       timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,

  CONSTRAINT lotes_cafe_numero_lote_key UNIQUE (numero_lote),
  CONSTRAINT lotes_cafe_public_id_key UNIQUE (public_id),
  CONSTRAINT lotes_cafe_vendido_no_disponible CHECK (NOT (vendido AND disponible))
);

CREATE TRIGGER trg_lotes_updated_at
  BEFORE UPDATE ON public.lotes_cafe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_lotes_activos_fecha ON public.lotes_cafe (fecha_recibido DESC, id_lote DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_lotes_numero_trgm ON public.lotes_cafe USING gin (numero_lote gin_trgm_ops)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_lotes_productor ON public.lotes_cafe (productor_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_lotes_finca ON public.lotes_cafe (finca_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_lotes_enproceso ON public.lotes_cafe (enproceso)
  WHERE deleted_at IS NULL;

ALTER TABLE public.lotes_cafe ENABLE ROW LEVEL SECURITY;

CREATE POLICY lotes_select ON public.lotes_cafe
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY lotes_insert ON public.lotes_cafe
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY lotes_update ON public.lotes_cafe
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.lotes_cafe FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.lotes_cafe TO authenticated;
GRANT ALL ON public.lotes_cafe TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lotes_cafe_id_lote_seq TO authenticated, service_role;

-- ── 2. Caracterización de materia prima ─────────────────────────────────────
CREATE TABLE public.caracterizacion_lote (
  id_caracterizacion        serial PRIMARY KEY,
  id_lote                   integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE CASCADE,
  fecha_hora                timestamptz NOT NULL DEFAULT now(),
  proceso                   varchar(50),
  -- Conteo por estado de maduración (cantidades)
  cerezas_verdes            integer CHECK (cerezas_verdes >= 0),
  cerezas_semimaduras       integer CHECK (cerezas_semimaduras >= 0),
  cerezas_en_objetivo       integer CHECK (cerezas_en_objetivo >= 0),
  cerezas_sobremaduras      integer CHECK (cerezas_sobremaduras >= 0),
  cerezas_secas             integer CHECK (cerezas_secas >= 0),
  -- Refractómetro (°Bx): 5 lecturas + promedio por estado
  semimadura_1              numeric(5,2),
  semimadura_2              numeric(5,2),
  semimadura_3              numeric(5,2),
  semimadura_4              numeric(5,2),
  semimadura_5              numeric(5,2),
  semimadura_bx_promedio    numeric(5,2),
  madura_1                  numeric(5,2),
  madura_2                  numeric(5,2),
  madura_3                  numeric(5,2),
  madura_4                  numeric(5,2),
  madura_5                  numeric(5,2),
  madura_bx_promedio        numeric(5,2),
  sobremadura_1             numeric(5,2),
  sobremadura_2             numeric(5,2),
  sobremadura_3             numeric(5,2),
  sobremadura_4             numeric(5,2),
  sobremadura_5             numeric(5,2),
  sobremadura_bx_promedio   numeric(5,2),
  observaciones_aspecto_textura text,
  -- Resumen y muestra (500 g)
  densidad_g_ml             numeric(6,3),
  escala_maduracion         varchar(50),
  rango_optimo_madurez      varchar(50),
  muestreo_tabla            numeric(8,2),
  -- Muestra (%)
  pct_verdes_muestra        numeric(5,2) CHECK (pct_verdes_muestra BETWEEN 0 AND 100),
  pct_debajo_objetivo_muestra numeric(5,2) CHECK (pct_debajo_objetivo_muestra BETWEEN 0 AND 100),
  pct_objetivo_muestra      numeric(5,2) CHECK (pct_objetivo_muestra BETWEEN 0 AND 100),
  pct_encima_objetivo_muestra numeric(5,2) CHECK (pct_encima_objetivo_muestra BETWEEN 0 AND 100),
  pct_secas_muestra         numeric(5,2) CHECK (pct_secas_muestra BETWEEN 0 AND 100),
  -- Flotación (g)
  g_vanos                   numeric(8,2) CHECK (g_vanos >= 0),
  g_secos                   numeric(8,2) CHECK (g_secos >= 0),
  g_broca                   numeric(8,2) CHECK (g_broca >= 0),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz
);

CREATE TRIGGER trg_caracterizacion_updated_at
  BEFORE UPDATE ON public.caracterizacion_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX caracterizacion_lote_viva_uidx ON public.caracterizacion_lote (id_lote)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_caracterizacion_lote ON public.caracterizacion_lote (id_lote)
  WHERE deleted_at IS NULL;

ALTER TABLE public.caracterizacion_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY caracterizacion_select ON public.caracterizacion_lote
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY caracterizacion_insert ON public.caracterizacion_lote
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY caracterizacion_update ON public.caracterizacion_lote
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.caracterizacion_lote FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.caracterizacion_lote TO authenticated;
GRANT ALL ON public.caracterizacion_lote TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.caracterizacion_lote_id_caracterizacion_seq TO authenticated, service_role;

-- ── 3. Secado ───────────────────────────────────────────────────────────────
CREATE TABLE public.secado_lote (
  id_secado                 serial PRIMARY KEY,
  id_lote                   integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE CASCADE,
  tiempo_secado             varchar(50),
  fecha_inicio_secado       date,
  fecha_finalizacion_secado date,
  dias_secado               integer CHECK (dias_secado >= 0),
  numero_cama               varchar(50),
  porcentaje_solar          numeric(5,2) CHECK (porcentaje_solar BETWEEN 0 AND 100),
  porcentaje_mecanico       numeric(5,2) CHECK (porcentaje_mecanico BETWEEN 0 AND 100),
  humedad_1                 numeric(5,2),
  humedad_2                 numeric(5,2),
  humedad_3                 numeric(5,2),
  humedad_4                 numeric(5,2),
  humedad_5                 numeric(5,2),
  humedad_6                 numeric(5,2),
  tem_1                     numeric(5,2),
  tem_2                     numeric(5,2),
  tem_3                     numeric(5,2),
  tem_4                     numeric(5,2),
  tem_5                     numeric(5,2),
  tem_6                     numeric(5,2),
  peso_inicial              numeric(10,2) CHECK (peso_inicial >= 0),
  peso_final                numeric(10,2) CHECK (peso_final >= 0),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz,

  CONSTRAINT secado_lote_fechas_check CHECK (
    fecha_finalizacion_secado IS NULL OR fecha_inicio_secado IS NULL
    OR fecha_finalizacion_secado >= fecha_inicio_secado
  )
);

CREATE TRIGGER trg_secado_updated_at
  BEFORE UPDATE ON public.secado_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX secado_lote_viva_uidx ON public.secado_lote (id_lote)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_secado_lote ON public.secado_lote (id_lote)
  WHERE deleted_at IS NULL;

ALTER TABLE public.secado_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY secado_select ON public.secado_lote
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY secado_insert ON public.secado_lote
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY secado_update ON public.secado_lote
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.secado_lote FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.secado_lote TO authenticated;
GRANT ALL ON public.secado_lote TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.secado_lote_id_secado_seq TO authenticated, service_role;

-- ── 4. Bodegaje ─────────────────────────────────────────────────────────────
CREATE TABLE public.bodega_lote (
  id_bodega                    serial PRIMARY KEY,
  id_lote                      integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE CASCADE,
  inicio_reposo                date,
  cantidad_sacos               integer CHECK (cantidad_sacos >= 0),
  peso_pergamino               numeric(10,2) CHECK (peso_pergamino >= 0),
  peso_bellota                 numeric(10,2) CHECK (peso_bellota >= 0),
  humedad_inicial              numeric(5,2),
  humedad_final                numeric(5,2),
  densidad_pergamino           numeric(8,3),
  densidad_bellota             numeric(8,3),
  lectura_humedad_relativa     numeric(5,2) CHECK (lectura_humedad_relativa BETWEEN 0 AND 100),
  lectura_temperatura_interna  numeric(5,2),
  lectura_temperatura_externa  numeric(5,2),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  deleted_at                   timestamptz
);

CREATE TRIGGER trg_bodega_updated_at
  BEFORE UPDATE ON public.bodega_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX bodega_lote_viva_uidx ON public.bodega_lote (id_lote)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_bodega_lote ON public.bodega_lote (id_lote)
  WHERE deleted_at IS NULL;

ALTER TABLE public.bodega_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY bodega_select ON public.bodega_lote
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY bodega_insert ON public.bodega_lote
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY bodega_update ON public.bodega_lote
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.bodega_lote FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.bodega_lote TO authenticated;
GRANT ALL ON public.bodega_lote TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.bodega_lote_id_bodega_seq TO authenticated, service_role;

-- ── 5. Trilla ───────────────────────────────────────────────────────────────
CREATE TABLE public.trilla_lote (
  id_trilla                          serial PRIMARY KEY,
  id_lote                            integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE CASCADE,
  fecha_final_reposo                 date,
  rendimiento_teorico_pelado         numeric(5,2) CHECK (rendimiento_teorico_pelado BETWEEN 0 AND 100),
  rendimiento_teorico_seleccion      numeric(5,2) CHECK (rendimiento_teorico_seleccion BETWEEN 0 AND 100),
  rendimiento_final_pelado           numeric(5,2) CHECK (rendimiento_final_pelado BETWEEN 0 AND 100),
  rendimiento_final_seleccion        numeric(5,2) CHECK (rendimiento_final_seleccion BETWEEN 0 AND 100),
  peso_en_verde_teorico              numeric(10,2) CHECK (peso_en_verde_teorico >= 0),
  peso_verde_final                   numeric(10,2) CHECK (peso_verde_final >= 0),
  humedad_inicial_pergamino_bellota  numeric(5,2),
  humedad_final_verde                numeric(5,2),
  porcentaje_primera                 numeric(5,2) CHECK (porcentaje_primera BETWEEN 0 AND 100),
  porcentaje_madres                  numeric(5,2) CHECK (porcentaje_madres BETWEEN 0 AND 100),
  porcentaje_caracolillo             numeric(5,2) CHECK (porcentaje_caracolillo BETWEEN 0 AND 100),
  porcentaje_menudos                 numeric(5,2) CHECK (porcentaje_menudos BETWEEN 0 AND 100),
  porcentaje_cataduras               numeric(5,2) CHECK (porcentaje_cataduras BETWEEN 0 AND 100),
  porcentaje_segundas                numeric(5,2) CHECK (porcentaje_segundas BETWEEN 0 AND 100),
  porcentaje_barreduras              numeric(5,2) CHECK (porcentaje_barreduras BETWEEN 0 AND 100),
  porcentaje_escogeduras             numeric(5,2) CHECK (porcentaje_escogeduras BETWEEN 0 AND 100),
  porcentaje_otras_inferiores        numeric(5,2) CHECK (porcentaje_otras_inferiores BETWEEN 0 AND 100),
  peso_en_verde_final                numeric(10,2) CHECK (peso_en_verde_final >= 0),
  peso_verde_inferiores              numeric(10,2) CHECK (peso_verde_inferiores >= 0),
  created_at                         timestamptz NOT NULL DEFAULT now(),
  updated_at                         timestamptz NOT NULL DEFAULT now(),
  deleted_at                         timestamptz
);

CREATE TRIGGER trg_trilla_updated_at
  BEFORE UPDATE ON public.trilla_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX trilla_lote_viva_uidx ON public.trilla_lote (id_lote)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_trilla_lote ON public.trilla_lote (id_lote)
  WHERE deleted_at IS NULL;

ALTER TABLE public.trilla_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY trilla_select ON public.trilla_lote
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY trilla_insert ON public.trilla_lote
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY trilla_update ON public.trilla_lote
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.trilla_lote FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.trilla_lote TO authenticated;
GRANT ALL ON public.trilla_lote TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.trilla_lote_id_trilla_seq TO authenticated, service_role;

-- ── 6. Catación simplificada ────────────────────────────────────────────────
CREATE TABLE public.catacion_tueste (
  id_catacion_tueste serial PRIMARY KEY,
  id_lote             integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE RESTRICT,
  catado              boolean NOT NULL DEFAULT false,
  notas_catacion      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TRIGGER trg_catacion_updated_at
  BEFORE UPDATE ON public.catacion_tueste
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX catacion_tueste_id_lote_uidx ON public.catacion_tueste (id_lote)
  WHERE deleted_at IS NULL;

ALTER TABLE public.catacion_tueste ENABLE ROW LEVEL SECURITY;

CREATE POLICY catacion_select ON public.catacion_tueste
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY catacion_insert ON public.catacion_tueste
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

CREATE POLICY catacion_update ON public.catacion_tueste
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.catacion_tueste FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.catacion_tueste TO authenticated;
GRANT ALL ON public.catacion_tueste TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.catacion_tueste_id_catacion_tueste_seq TO authenticated, service_role;

-- ── 7. Trazabilidad orden ↔ lote ────────────────────────────────────────────
CREATE TABLE public.orden_lotes (
  id_orden_lote serial PRIMARY KEY,
  id_orden      integer NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
  id_lote       integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE UNIQUE INDEX orden_lotes_viva_uidx ON public.orden_lotes (id_orden, id_lote)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_orden_lotes_lote ON public.orden_lotes (id_lote)
  WHERE deleted_at IS NULL;

ALTER TABLE public.orden_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY orden_lotes_select ON public.orden_lotes
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY orden_lotes_insert ON public.orden_lotes
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY orden_lotes_update ON public.orden_lotes
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

REVOKE ALL ON public.orden_lotes FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.orden_lotes TO authenticated;
GRANT ALL ON public.orden_lotes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orden_lotes_id_orden_lote_seq TO authenticated, service_role;
