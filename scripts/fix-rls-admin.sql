-- ============================================================
-- FIX: CAMBIAR get_empleado_rol() a SECURITY INVOKER
-- ============================================================
-- Motivo: SECURITY DEFINER en schema public es un riesgo de seguridad.
-- La policy empleados_lectura_propia ya permite leer el propio rol.

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
-- VINCULAR UUID DEL ADMIN
-- ============================================================
-- Reemplazar con el UUID real del usuario admin de Supabase Auth
UPDATE empleados SET id_auth = '<UUID_DEL_USUARIO_ADMIN>' WHERE id_empleado = 1;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT get_empleado_rol() AS mi_rol;
SELECT id_empleado, id_auth, rol FROM empleados;
