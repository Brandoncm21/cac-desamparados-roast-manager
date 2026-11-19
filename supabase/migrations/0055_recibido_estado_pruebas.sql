-- 0055: Recibido de Café — estado comercial, numeración automática, nuevas pruebas y limpieza

-- Estado comercial manual del lote
ALTER TABLE public.lotes_cafe
  ADD COLUMN IF NOT EXISTS estado_lote varchar(20) NOT NULL DEFAULT 'proceso',
  ADD COLUMN IF NOT EXISTS proceso_otro varchar(100),
  ADD COLUMN IF NOT EXISTS porcentaje_segundas numeric(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_danos_mecanicos numeric(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_pulpa_pergamino numeric(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_pergamino_pulpa numeric(5,2),
  ADD COLUMN IF NOT EXISTS densidad_fruta numeric(6,3),
  ADD COLUMN IF NOT EXISTS densidad_pergamino_humedo numeric(6,3);

-- Checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_estado_lote_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_estado_lote_check
      CHECK (estado_lote IN ('proceso', 'disponible', 'vendido'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_segundas_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_segundas_check
      CHECK (porcentaje_segundas BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_danos_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_danos_check
      CHECK (porcentaje_danos_mecanicos BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_pulpa_pergamino_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_pulpa_pergamino_check
      CHECK (porcentaje_pulpa_pergamino BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_pergamino_pulpa_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_pergamino_pulpa_check
      CHECK (porcentaje_pergamino_pulpa BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_densidad_fruta_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_densidad_fruta_check
      CHECK (densidad_fruta > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_densidad_pergamino_humedo_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_densidad_pergamino_humedo_check
      CHECK (densidad_pergamino_humedo > 0);
  END IF;
END $$;

-- Backfill estado_lote
UPDATE public.lotes_cafe
SET estado_lote = CASE
  WHEN vendido = true OR enproceso = 'Vendido' THEN 'vendido'
  WHEN disponible = true THEN 'disponible'
  ELSE 'proceso'
END;

ALTER TABLE public.lotes_cafe ALTER COLUMN disponible SET DEFAULT false;

-- Sincronizar flags/estado desde estado_lote (y opcionalmente desde enproceso)
CREATE OR REPLACE FUNCTION sincronizar_estado_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.enproceso = 'Vendido' THEN
    NEW.estado_lote := 'vendido';
  END IF;

  IF NEW.estado_lote = 'vendido' THEN
    NEW.vendido := true;
    NEW.disponible := false;
  ELSIF NEW.estado_lote = 'disponible' THEN
    NEW.vendido := false;
    NEW.disponible := true;
  ELSE
    NEW.estado_lote := 'proceso';
    NEW.vendido := false;
    NEW.disponible := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_estado_lote ON public.lotes_cafe;
CREATE TRIGGER trg_sincronizar_estado_lote
  BEFORE INSERT OR UPDATE ON public.lotes_cafe
  FOR EACH ROW
  EXECUTE FUNCTION sincronizar_estado_lote();

-- Generar números de lote y recibo automáticamente
CREATE OR REPLACE FUNCTION generar_numeros_recibido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_lote IS NULL OR btrim(NEW.numero_lote) = '' THEN
    NEW.numero_lote := 'L-' || LPAD(NEW.id_lote::text, 5, '0');
  END IF;
  IF NEW.numero_recibo IS NULL OR btrim(NEW.numero_recibo) = '' THEN
    NEW.numero_recibo := 'R-' || LPAD(NEW.id_lote::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generar_numeros_recibido ON public.lotes_cafe;
CREATE TRIGGER trg_generar_numeros_recibido
  BEFORE INSERT ON public.lotes_cafe
  FOR EACH ROW
  EXECUTE FUNCTION generar_numeros_recibido();

-- Proceso extendido
ALTER TABLE public.lotes_cafe DROP CONSTRAINT IF EXISTS lotes_cafe_proceso_check;
ALTER TABLE public.lotes_cafe
  ADD CONSTRAINT lotes_cafe_proceso_check
  CHECK (proceso IN ('Lavado', 'Honey', 'Natural', 'Miel', 'Semilavado', 'Anaeróbico', 'Otro'));

-- Limpiar campos removidos del modelo
ALTER TABLE public.lotes_cafe DROP COLUMN IF EXISTS ph_miel;
ALTER TABLE public.lotes_cafe DROP COLUMN IF EXISTS rango_objetivo;
ALTER TABLE public.lotes_cafe DROP COLUMN IF EXISTS rango_sobre_objetivo;
ALTER TABLE public.lotes_cafe DROP COLUMN IF EXISTS rango;

CREATE INDEX IF NOT EXISTS idx_lotes_estado_lote ON public.lotes_cafe (estado_lote) WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
