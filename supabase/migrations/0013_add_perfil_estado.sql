-- ============================================================
-- Fase CRUD: Agregar estado a perfiles_tueste para separación visual
-- ============================================================

-- 1) Agregar columna estado con default 'Pendiente'
ALTER TABLE perfiles_tueste 
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente';

-- 2) Actualizar perfiles existentes: si tiene hito 'Final', está Completado
UPDATE perfiles_tueste p
SET estado = 'Completado'
WHERE EXISTS (
  SELECT 1 FROM hitos_termicos h 
  WHERE h.id_perfil = p.id_perfil AND h.tipo_hito = 'Final'
)
AND p.estado = 'Pendiente';

-- 3) Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_perfiles_estado ON perfiles_tueste(estado);
