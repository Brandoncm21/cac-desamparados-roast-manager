-- ============================================================
-- Fase 8 (seed): Tarifas iniciales por intervalo y capacidades
-- ============================================================

-- Seed helper: id de servicio por código
DO $$
DECLARE
  v_id INT;
BEGIN
  -- Chancado
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'CHANCADO';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 1500, 1, 5),
      (v_id, 1200, 5, 25),
      (v_id, 1000, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Trillado
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'TRILLADO';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 1800, 1, 5),
      (v_id, 1500, 5, 25),
      (v_id, 1200, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Clasificación Mecánica
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'CLASIFICACION-M';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 2000, 1, 5),
      (v_id, 1600, 5, 25),
      (v_id, 1400, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Clasificación Manual
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'CLASIFICACION-N';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 2500, 1, 5),
      (v_id, 2000, 5, 25),
      (v_id, 1800, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Tueste
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'TUESTE';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 3500, 1, 5),
      (v_id, 3000, 5, 25),
      (v_id, 2500, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Molido
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'MOLIDO';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 1500, 1, 5),
      (v_id, 1200, 5, 25),
      (v_id, 1000, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Empacado
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE codigo = 'EMPACADO';
  IF v_id IS NOT NULL THEN
    INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg)
    VALUES
      (v_id, 800, 1, 5),
      (v_id, 600, 5, 25),
      (v_id, 500, 25, NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Precios iniciales de empaques (solo si no tienen precio vigente)
INSERT INTO empaque_precios (id_empaque, precio, valid_from)
SELECT e.id_empaque,
  CASE e.nombre
    WHEN 'Bolsa con válvula 500g' THEN 200
    WHEN 'Bolsa con válvula 1Kg' THEN 500
    WHEN 'Bolsa 5Kg' THEN 1500
    WHEN 'Saco 46Kg' THEN 5000
    ELSE 0
  END,
  now()
FROM empaques e
WHERE NOT EXISTS (
  SELECT 1 FROM empaque_precios ep WHERE ep.id_empaque = e.id_empaque
);

-- Capacidades de empaques
UPDATE empaques SET capacidad_kg = 0.5 WHERE nombre = 'Bolsa con válvula 500g' AND capacidad_kg IS NULL;
UPDATE empaques SET capacidad_kg = 1.0 WHERE nombre = 'Bolsa con válvula 1Kg' AND capacidad_kg IS NULL;
UPDATE empaques SET capacidad_kg = 5.0 WHERE nombre = 'Bolsa 5Kg' AND capacidad_kg IS NULL;
UPDATE empaques SET capacidad_kg = 46.0 WHERE nombre = 'Saco 46Kg' AND capacidad_kg IS NULL;
-- 'A granel' → capacidad_kg = NULL (no aplica)
