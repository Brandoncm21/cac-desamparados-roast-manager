-- Fix RLS recursion on empleados table
-- El subquery recursivo en empleados_admin_full causaba 500 al consultar empleados.
-- Esta migración:
-- 1. Garantiza que get_empleado_rol sea SECURITY DEFINER (bypass RLS)
-- 2. Reemplaza la policy recursiva por una que usa la función
-- 3. Agrega policy de SELECT para empleados activos (necesaria para dropdown de responsable)

CREATE OR REPLACE FUNCTION get_empleado_rol()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
BEGIN
  SELECT rol INTO v_rol
  FROM empleados
  WHERE id_auth = auth.uid();

  RETURN v_rol;
END;
$$;

DROP POLICY IF EXISTS "empleados_admin_full" ON empleados;

CREATE POLICY "empleados_admin_full" ON empleados
  FOR ALL TO authenticated
  USING (get_empleado_rol() = 'Admin')
  WITH CHECK (get_empleado_rol() = 'Admin');

CREATE POLICY "empleados_select_activos" ON empleados
  FOR SELECT TO authenticated
  USING (activo = true);
