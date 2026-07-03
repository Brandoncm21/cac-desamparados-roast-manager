-- ============================================================
-- FIX: Recursión RLS con SECURITY INVOKER
-- ============================================================
-- Problema: get_empleado_rol() con SECURITY INVOKER causaba que
-- la policy "empleados_admin_full" (que también la llama) creara
-- una llamada circular → 500 en INSERT.
--
-- Solución:
--   1. Revertir a SECURITY DEFINER (la función necesita bypass RLS)
--   2. Cambiar policy "empleados_admin_full" para no usar get_empleado_rol()

-- 1) Recrear función con SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_empleado_rol()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol::TEXT INTO v_rol FROM empleados WHERE id_auth = auth.uid();
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2) Recrear policy sin recursión
DROP POLICY IF EXISTS "empleados_admin_full" ON empleados;
CREATE POLICY "empleados_admin_full" ON empleados
  FOR ALL TO authenticated USING (
    auth.uid() IN (SELECT id_auth FROM empleados WHERE rol = 'Admin')
  );

-- 3) Verificación
SELECT get_empleado_rol() AS mi_rol;
