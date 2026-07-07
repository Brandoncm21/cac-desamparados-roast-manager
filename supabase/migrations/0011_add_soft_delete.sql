-- ============================================================
-- Fase CRUD: Soft Delete para Clientes, Ordenes y Perfiles de Tueste
-- ============================================================

-- 1) Agregar columna deleted_at a tablas principales
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE perfiles_tueste ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2) Índices parciales para consultas frecuentes (solo activos)
CREATE INDEX IF NOT EXISTS idx_clientes_deleted_at ON clientes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ordenes_deleted_at ON ordenes_trabajo(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_perfiles_deleted_at ON perfiles_tueste(deleted_at) WHERE deleted_at IS NULL;
