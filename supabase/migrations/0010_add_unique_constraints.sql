-- ============================================================
-- Fase 4.1: Re-agregar UNIQUE constraints para upsert offline
-- ============================================================

-- UNIQUE constraint para upsert de trazabilidad_temperatura
ALTER TABLE trazabilidad_temperatura
  DROP CONSTRAINT IF EXISTS trazabilidad_temperatura_id_perfil_minuto_key;

ALTER TABLE trazabilidad_temperatura
  ADD CONSTRAINT trazabilidad_temperatura_id_perfil_minuto_key
  UNIQUE (id_perfil, minuto);

-- UNIQUE constraint para upsert de hitos_termicos
ALTER TABLE hitos_termicos
  DROP CONSTRAINT IF EXISTS hitos_termicos_id_perfil_tipo_hito_key;

ALTER TABLE hitos_termicos
  ADD CONSTRAINT hitos_termicos_id_perfil_tipo_hito_key
  UNIQUE (id_perfil, tipo_hito);
