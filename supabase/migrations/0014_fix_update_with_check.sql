-- ============================================================
-- Fix: Agregar WITH CHECK (true) explícito a políticas UPDATE
-- ============================================================
-- PostgreSQL usa la condición USING como WITH CHECK implícito
-- cuando no se especifica WITH CHECK. Esto causaba error 42501
-- al hacer soft delete porque la nueva fila re-evaluaba USING.
--
-- Al usar WITH CHECK (true) permitimos cualquier modificación a
-- las filas que el usuario pueda ver según USING.

-- ============================================================
-- CLIENTES
-- ============================================================
DROP POLICY IF EXISTS "clientes_update" ON clientes;
CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

-- ============================================================
-- ÓRDENES DE TRABAJO
-- ============================================================
DROP POLICY IF EXISTS "ordenes_update" ON ordenes_trabajo;
CREATE POLICY "ordenes_update" ON ordenes_trabajo
  FOR UPDATE TO authenticated
  USING (
    get_empleado_rol() = 'Admin' OR
    (estado_orden IN ('Pendiente', 'En Proceso') AND get_empleado_rol() IN ('Recepción', 'Tostador'))
  )
  WITH CHECK (true);

-- ============================================================
-- PERFILES DE TUESTE
-- ============================================================
DROP POLICY IF EXISTS "perfiles_update" ON perfiles_tueste;
CREATE POLICY "perfiles_update" ON perfiles_tueste
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin'))
  WITH CHECK (true);
