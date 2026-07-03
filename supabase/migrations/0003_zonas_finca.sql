-- Tabla de zonas/fincas con catálogo administrable
CREATE TABLE IF NOT EXISTS zonas_finca (
  id_zona SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE zonas_finca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zonas_select" ON zonas_finca;
CREATE POLICY "zonas_select" ON zonas_finca
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "zonas_insert" ON zonas_finca;
CREATE POLICY "zonas_insert" ON zonas_finca
  FOR INSERT TO authenticated WITH CHECK (true);

-- Agregar columna zona a las órdenes de trabajo
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS zona_finca VARCHAR(150);
