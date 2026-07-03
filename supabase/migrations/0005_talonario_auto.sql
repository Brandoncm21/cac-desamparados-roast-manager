-- Número de talonario secuencial, auto-generado al completar la orden
CREATE SEQUENCE IF NOT EXISTS talonario_seq START 454;

ALTER TABLE ordenes_trabajo ALTER COLUMN num_talonario_fisico DROP NOT NULL;

CREATE OR REPLACE FUNCTION generar_talonario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_orden = 'Completado'
     AND (OLD.num_talonario_fisico IS NULL OR OLD.num_talonario_fisico = '') THEN
    NEW.num_talonario_fisico := LPAD(NEXTVAL('talonario_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_talonario_auto ON ordenes_trabajo;
CREATE TRIGGER trg_talonario_auto
BEFORE UPDATE ON ordenes_trabajo
FOR EACH ROW EXECUTE FUNCTION generar_talonario();
