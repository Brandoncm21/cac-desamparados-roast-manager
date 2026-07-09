-- ============================================================
-- Fase 6 Fix: Agregar WITH CHECK (true) a políticas UPDATE del módulo de tueste
-- ============================================================
-- Las políticas UPDATE de metricas, ajustes, hitos y temperaturas
-- no tenían WITH CHECK explícito, causando error 42501 al hacer upsert.

-- Métricas de Tueste
DROP POLICY IF EXISTS "metricas_update" ON metricas_tueste;
CREATE POLICY "metricas_update" ON metricas_tueste
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin'))
  WITH CHECK (true);

-- Ajustes de Tueste
DROP POLICY IF EXISTS "ajustes_update" ON ajustes_tueste;
CREATE POLICY "ajustes_update" ON ajustes_tueste
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin'))
  WITH CHECK (true);

-- Hitos Térmicos
DROP POLICY IF EXISTS "hitos_update" ON hitos_termicos;
CREATE POLICY "hitos_update" ON hitos_termicos
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin'))
  WITH CHECK (true);

-- Trazabilidad de Temperatura
DROP POLICY IF EXISTS "temperaturas_update" ON trazabilidad_temperatura;
CREATE POLICY "temperaturas_update" ON trazabilidad_temperatura
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin'))
  WITH CHECK (true);
