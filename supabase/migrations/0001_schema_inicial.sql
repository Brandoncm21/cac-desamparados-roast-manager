-- ============================================================
-- SCACR - Schema v2 — corregido contra talonarios físicos reales
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE proceso_cafe_enum AS ENUM ('Lavado', 'Honey', 'Natural', 'Otro');
CREATE TYPE estado_orden_enum AS ENUM ('Pendiente', 'En Proceso', 'Completado', 'Cancelado');
CREATE TYPE tipo_servicio_enum AS ENUM (
  'Chancado', 'Trillado', 'Clasificación Mecánica', 'Clasificación Manual',
  'Tueste', 'Molido', 'Empacado'
);
CREATE TYPE tipo_metrica_enum AS ENUM ('Peso', 'Humedad', 'Densidad');
CREATE TYPE tipo_hito_enum AS ENUM (
  'Turning Point', 'Amarillo', 'Marrón', 'Crack Inicial', 'Crack Final',
  'Segundo Crack', 'Final', 'Tiempo Enfriamiento'
);
CREATE TYPE rol_empleado_enum AS ENUM ('Operador', 'Tostador', 'Recepción', 'Admin');

-- ---------- EMPLEADOS ----------
CREATE TABLE empleados (
  id_empleado   SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  rol           rol_empleado_enum NOT NULL,
  id_auth       UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CLIENTES ----------
CREATE TABLE clientes (
  id_cliente        SERIAL PRIMARY KEY,
  nombre_completo   VARCHAR(200) NOT NULL,
  telefono          VARCHAR(30),
  zona_procedencia  VARCHAR(150),
  fecha_registro    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_nombre ON clientes(nombre_completo);

-- ---------- ORDENES DE TRABAJO ----------
CREATE TABLE ordenes_trabajo (
  id_orden                SERIAL PRIMARY KEY,
  num_talonario_fisico    VARCHAR(20) NOT NULL UNIQUE,
  id_cliente              INT NOT NULL REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
  num_factura             VARCHAR(30),
  porcentaje_humedad_entrada NUMERIC(5,2) CHECK (porcentaje_humedad_entrada BETWEEN 0 AND 100),
  proceso_cafe            proceso_cafe_enum NOT NULL DEFAULT 'Otro',
  descripcion_producto    TEXT,
  id_empleado_recibe      INT REFERENCES empleados(id_empleado),
  id_empleado_entrega     INT REFERENCES empleados(id_empleado),
  fecha_orden             DATE NOT NULL DEFAULT CURRENT_DATE,
  estado_orden            estado_orden_enum NOT NULL DEFAULT 'Pendiente',
  firma_aprobacion_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_aprobacion        DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ordenes_talonario ON ordenes_trabajo(num_talonario_fisico);
CREATE INDEX idx_ordenes_cliente ON ordenes_trabajo(id_cliente);
CREATE INDEX idx_ordenes_estado ON ordenes_trabajo(estado_orden);

-- ---------- SERVICIOS EJECUTADOS ----------
CREATE TABLE servicios_ejecutados (
  id_servicio       SERIAL PRIMARY KEY,
  id_orden          INT NOT NULL REFERENCES ordenes_trabajo(id_orden) ON DELETE CASCADE,
  tipo_servicio     tipo_servicio_enum NOT NULL,
  peso_inicial      NUMERIC(10,2),
  precio            NUMERIC(10,2),
  fecha_hora        TIMESTAMPTZ,
  id_operador       INT REFERENCES empleados(id_empleado),
  UNIQUE (id_orden, tipo_servicio)
);
CREATE INDEX idx_servicios_orden ON servicios_ejecutados(id_orden);

-- ---------- ESPECIFICACIONES Y MATERIALES ----------
CREATE TABLE especificaciones_orden (
  id_especificacion   SERIAL PRIMARY KEY,
  id_orden            INT NOT NULL UNIQUE REFERENCES ordenes_trabajo(id_orden) ON DELETE CASCADE,
  tipo_tueste         VARCHAR(100),
  tipo_molienda       VARCHAR(100),
  tipo_empaque        VARCHAR(100),
  especificacion_extra TEXT,
  observaciones       TEXT
);

-- ---------- PERFILES DE TUESTE ----------
CREATE TABLE perfiles_tueste (
  id_perfil         SERIAL PRIMARY KEY,
  id_orden          INT REFERENCES ordenes_trabajo(id_orden) ON DELETE SET NULL,
  numero_lote       VARCHAR(20),
  fecha_tueste      DATE NOT NULL DEFAULT CURRENT_DATE,
  id_tostador       INT REFERENCES empleados(id_empleado),
  nombre_cafe       VARCHAR(150),
  temperatura_sala  NUMERIC(5,2),
  humedad_sala      NUMERIC(5,2),
  tiempo_desarrollo_min NUMERIC(5,2),
  dtr_porcentaje         NUMERIC(5,2),
  fecha_optima_consumo   DATE,
  fecha_vencimiento       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_perfiles_orden ON perfiles_tueste(id_orden);
CREATE INDEX idx_perfiles_lote ON perfiles_tueste(numero_lote);

-- ---------- MÉTRICAS TUESTE ----------
CREATE TABLE metricas_tueste (
  id_metrica        SERIAL PRIMARY KEY,
  id_perfil         INT NOT NULL REFERENCES perfiles_tueste(id_perfil) ON DELETE CASCADE,
  tipo_metrica      tipo_metrica_enum NOT NULL,
  valor_antes       NUMERIC(10,3),
  valor_despues     NUMERIC(10,3),
  porcentaje_diferencia NUMERIC(6,2),
  UNIQUE (id_perfil, tipo_metrica)
);

-- ---------- TRAZABILIDAD DE TEMPERATURA ----------
CREATE TABLE trazabilidad_temperatura (
  id_registro           SERIAL PRIMARY KEY,
  id_perfil             INT NOT NULL REFERENCES perfiles_tueste(id_perfil) ON DELETE CASCADE,
  minuto                SMALLINT NOT NULL CHECK (minuto >= 0),
  temperatura_registrada NUMERIC(5,2) CHECK (temperatura_registrada BETWEEN 70 AND 220),
  UNIQUE (id_perfil, minuto)
);
CREATE INDEX idx_trazabilidad_perfil_minuto ON trazabilidad_temperatura(id_perfil, minuto);

-- ---------- HITOS TÉRMICOS ----------
CREATE TABLE hitos_termicos (
  id_hito       SERIAL PRIMARY KEY,
  id_perfil     INT NOT NULL REFERENCES perfiles_tueste(id_perfil) ON DELETE CASCADE,
  tipo_hito     tipo_hito_enum NOT NULL,
  tiempo_min    NUMERIC(5,2),
  temperatura   NUMERIC(5,2),
  UNIQUE (id_perfil, tipo_hito)
);

-- ---------- AJUSTES EN TIEMPO REAL ----------
CREATE TABLE ajustes_tueste (
  id_ajuste           SERIAL PRIMARY KEY,
  id_perfil           INT NOT NULL REFERENCES perfiles_tueste(id_perfil) ON DELETE CASCADE,
  orden_secuencia      SMALLINT NOT NULL,
  temperatura_ajuste   NUMERIC(5,2),
  llama                VARCHAR(50),
  tiempo               NUMERIC(5,2),
  aire                 VARCHAR(50),
  fecha_hora_ajuste    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_perfil, orden_secuencia)
);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- 1) % Diferencia en metricas_tueste
CREATE OR REPLACE FUNCTION calc_porcentaje_diferencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valor_antes IS NOT NULL AND NEW.valor_antes <> 0 AND NEW.valor_despues IS NOT NULL THEN
    NEW.porcentaje_diferencia := ((NEW.valor_antes - NEW.valor_despues) / NEW.valor_antes) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_metricas_diferencia
BEFORE INSERT OR UPDATE ON metricas_tueste
FOR EACH ROW EXECUTE FUNCTION calc_porcentaje_diferencia();

-- 2) Fechas de trazabilidad
CREATE OR REPLACE FUNCTION calc_fechas_trazabilidad()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_optima_consumo := NEW.fecha_tueste + INTERVAL '7 days';
  NEW.fecha_vencimiento := NEW.fecha_tueste + INTERVAL '365 days';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_perfiles_fechas
BEFORE INSERT OR UPDATE ON perfiles_tueste
FOR EACH ROW EXECUTE FUNCTION calc_fechas_trazabilidad();

-- 3) Tiempo de Desarrollo y DTR
CREATE OR REPLACE FUNCTION calc_dtr_perfil(p_id_perfil INT)
RETURNS VOID AS $$
DECLARE
  v_tiempo_total NUMERIC;
  v_tiempo_crack NUMERIC;
  v_desarrollo NUMERIC;
BEGIN
  SELECT tiempo_min INTO v_tiempo_total FROM hitos_termicos
    WHERE id_perfil = p_id_perfil AND tipo_hito = 'Final';
  SELECT tiempo_min INTO v_tiempo_crack FROM hitos_termicos
    WHERE id_perfil = p_id_perfil AND tipo_hito = 'Crack Inicial';

  IF v_tiempo_total IS NOT NULL AND v_tiempo_crack IS NOT NULL AND v_tiempo_total > v_tiempo_crack THEN
    v_desarrollo := v_tiempo_total - v_tiempo_crack;
    UPDATE perfiles_tueste
      SET tiempo_desarrollo_min = v_desarrollo,
          dtr_porcentaje = (v_desarrollo / v_tiempo_total) * 100
      WHERE id_perfil = p_id_perfil;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_hitos_recalc_dtr()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calc_dtr_perfil(COALESCE(NEW.id_perfil, OLD.id_perfil));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hitos_dtr
AFTER INSERT OR UPDATE OR DELETE ON hitos_termicos
FOR EACH ROW EXECUTE FUNCTION trg_hitos_recalc_dtr();

-- 4) updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ordenes_updated_at
BEFORE UPDATE ON ordenes_trabajo
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_perfiles_updated_at
BEFORE UPDATE ON perfiles_tueste
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCIÓN PARA CUSTOM JWT CLAIM (rol del empleado)
-- ============================================================
CREATE OR REPLACE FUNCTION get_empleado_rol()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol::TEXT INTO v_rol FROM empleados WHERE id_auth = auth.uid();
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- Empleados: lectura propia + admin full
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleados_lectura_propia" ON empleados
  FOR SELECT USING (id_auth = auth.uid());

CREATE POLICY "empleados_admin_full" ON empleados
  FOR ALL USING (get_empleado_rol() = 'Admin');

-- Clientes: lectura autenticados, escritura recepción/admin
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Recepción', 'Admin'));

-- Órdenes de trabajo
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordenes_select" ON ordenes_trabajo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ordenes_insert" ON ordenes_trabajo
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Tostador', 'Admin'));

CREATE POLICY "ordenes_update" ON ordenes_trabajo
  FOR UPDATE TO authenticated USING (
    get_empleado_rol() = 'Admin' OR
    (estado_orden IN ('Pendiente', 'En Proceso') AND get_empleado_rol() IN ('Recepción', 'Tostador'))
  );

-- Servicios ejecutados
ALTER TABLE servicios_ejecutados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servicios_select" ON servicios_ejecutados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "servicios_insert" ON servicios_ejecutados
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY "servicios_update" ON servicios_ejecutados
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY "servicios_delete" ON servicios_ejecutados
  FOR DELETE TO authenticated USING (
    get_empleado_rol() IN ('Recepción', 'Admin')
    AND EXISTS (SELECT 1 FROM ordenes_trabajo WHERE id_orden = servicios_ejecutados.id_orden AND estado_orden = 'Pendiente')
  );

-- Especificaciones orden
ALTER TABLE especificaciones_orden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "especificaciones_select" ON especificaciones_orden
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "especificaciones_insert" ON especificaciones_orden
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY "especificaciones_update" ON especificaciones_orden
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Recepción', 'Admin'));

-- Perfiles de tueste
ALTER TABLE perfiles_tueste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfiles_select" ON perfiles_tueste
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "perfiles_insert" ON perfiles_tueste
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

CREATE POLICY "perfiles_update" ON perfiles_tueste
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Tostador', 'Admin'));

-- Trazabilidad temperatura
ALTER TABLE trazabilidad_temperatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temperaturas_select" ON trazabilidad_temperatura
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "temperaturas_insert" ON trazabilidad_temperatura
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

CREATE POLICY "temperaturas_update" ON trazabilidad_temperatura
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Tostador', 'Admin'));

-- Hitos térmicos
ALTER TABLE hitos_termicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hitos_select" ON hitos_termicos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hitos_insert" ON hitos_termicos
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

CREATE POLICY "hitos_update" ON hitos_termicos
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Tostador', 'Admin'));

-- Métricas tueste
ALTER TABLE metricas_tueste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metricas_select" ON metricas_tueste
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "metricas_insert" ON metricas_tueste
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

CREATE POLICY "metricas_update" ON metricas_tueste
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Tostador', 'Admin'));

-- Ajustes tueste
ALTER TABLE ajustes_tueste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ajustes_select" ON ajustes_tueste
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ajustes_insert" ON ajustes_tueste
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

CREATE POLICY "ajustes_update" ON ajustes_tueste
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Tostador', 'Admin'));
