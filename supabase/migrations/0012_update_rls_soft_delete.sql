-- ============================================================
-- Fase CRUD: Actualizar políticas RLS para Soft Delete
-- ============================================================

-- Función auxiliar para soft delete (actualiza deleted_at)
CREATE OR REPLACE FUNCTION soft_delete_row(table_name TEXT, id_column TEXT, id_value INT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = now() WHERE %I = $1 AND deleted_at IS NULL', 
                 table_name, id_column)
  USING id_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CLIENTES
-- ============================================================

-- Reemplazar política SELECT para filtrar eliminados
DROP POLICY IF EXISTS "clientes_select" ON clientes;
CREATE POLICY "clientes_select" ON clientes
  FOR SELECT TO authenticated 
  USING (deleted_at IS NULL);

-- Actualizar política INSERT (sin cambios, Recepción/Admin)
DROP POLICY IF EXISTS "clientes_insert" ON clientes;
CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

-- Actualizar política UPDATE (sin cambios, Recepción/Admin)
DROP POLICY IF EXISTS "clientes_update" ON clientes;
CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Recepción', 'Admin'));

-- ============================================================
-- ÓRDENES DE TRABAJO
-- ============================================================

-- Reemplazar política SELECT para filtrar eliminados
DROP POLICY IF EXISTS "ordenes_select" ON ordenes_trabajo;
CREATE POLICY "ordenes_select" ON ordenes_trabajo
  FOR SELECT TO authenticated 
  USING (deleted_at IS NULL);

-- Actualizar política INSERT (sin cambios)
DROP POLICY IF EXISTS "ordenes_insert" ON ordenes_trabajo;
CREATE POLICY "ordenes_insert" ON ordenes_trabajo
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Tostador', 'Admin'));

-- Actualizar política UPDATE (sin cambios)
DROP POLICY IF EXISTS "ordenes_update" ON ordenes_trabajo;
CREATE POLICY "ordenes_update" ON ordenes_trabajo
  FOR UPDATE TO authenticated USING (
    get_empleado_rol() = 'Admin' OR
    (estado_orden IN ('Pendiente', 'En Proceso') AND get_empleado_rol() IN ('Recepción', 'Tostador'))
  );

-- ============================================================
-- PERFILES DE TUESTE
-- ============================================================

-- Reemplazar política SELECT para filtrar eliminados
DROP POLICY IF EXISTS "perfiles_select" ON perfiles_tueste;
CREATE POLICY "perfiles_select" ON perfiles_tueste
  FOR SELECT TO authenticated 
  USING (deleted_at IS NULL);

-- Actualizar política INSERT (sin cambios)
DROP POLICY IF EXISTS "perfiles_insert" ON perfiles_tueste;
CREATE POLICY "perfiles_insert" ON perfiles_tueste
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));

-- Actualizar política UPDATE (sin cambios)
DROP POLICY IF EXISTS "perfiles_update" ON perfiles_tueste;
CREATE POLICY "perfiles_update" ON perfiles_tueste
  FOR UPDATE TO authenticated USING (get_empleado_rol() IN ('Tostador', 'Admin'));
