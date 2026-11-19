-- 0056: Recibido de Café — snapshot zona/altura, limpieza numérica, factura automática y obligatorios

ALTER TABLE public.lotes_cafe
  ADD COLUMN IF NOT EXISTS zona_finca varchar(150),
  ADD COLUMN IF NOT EXISTS altura_finca numeric(10,2),
  ADD COLUMN IF NOT EXISTS porcentaje_puro numeric(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_impuro numeric(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_limpio numeric(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_sucio numeric(5,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_altura_finca_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_altura_finca_check
      CHECK (altura_finca >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_puro_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_puro_check
      CHECK (porcentaje_puro BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_impuro_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_impuro_check
      CHECK (porcentaje_impuro BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_limpio_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_limpio_check
      CHECK (porcentaje_limpio BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_porcentaje_sucio_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_porcentaje_sucio_check
      CHECK (porcentaje_sucio BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_cafe_varietal_no_vacio_check'
  ) THEN
    ALTER TABLE public.lotes_cafe
      ADD CONSTRAINT lotes_cafe_varietal_no_vacio_check
      CHECK (varietal IS NULL OR btrim(varietal) <> '');
  END IF;
END $$;

-- Snapshot de zona/altura para lotes existentes
UPDATE public.lotes_cafe l
SET zona_finca = z.nombre,
    altura_finca = f.altura
FROM public.fincas f
LEFT JOIN public.zonas_finca z ON z.id_zona = f.zona_id
WHERE f.id_finca = l.finca_id
  AND (l.zona_finca IS NULL OR l.altura_finca IS NULL);

-- Factura automática para registros sin factura (distinta de la factura de órdenes F-0001)
UPDATE public.lotes_cafe
SET factura = 'FC-' || LPAD(id_lote::text, 5, '0')
WHERE factura IS NULL OR btrim(factura) = '';

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
  IF NEW.factura IS NULL OR btrim(NEW.factura) = '' THEN
    NEW.factura := 'FC-' || LPAD(NEW.id_lote::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generar_numeros_recibido ON public.lotes_cafe;
CREATE TRIGGER trg_generar_numeros_recibido
  BEFORE INSERT ON public.lotes_cafe
  FOR EACH ROW
  EXECUTE FUNCTION generar_numeros_recibido();

-- Limpieza ahora son porcentajes; los booleanos quedan obsoletos
ALTER TABLE public.lotes_cafe DROP COLUMN IF EXISTS puro_impuro;
ALTER TABLE public.lotes_cafe DROP COLUMN IF EXISTS limpio_sucio;

CREATE INDEX IF NOT EXISTS idx_lotes_zona_finca ON public.lotes_cafe (zona_finca) WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
