-- 0031_trilla.sql
-- P2d de 002-fusion-cbf: Trilla (rendimientos/clasificación) + peso_verde 1:1
-- ("Lote de Exportación Internacional" en el layout Stitch). Referencias:
-- doc raíz §4.4.1, T8 (pesos facturados quedan en orden_pasos — aquí solo se
-- capturan los rendimientos completos), FR-003, disp. 6 (fechas timestamptz con
-- nombre honesto: ffinal_reposo timestamptz, NO numeric), reglas de porteo 1/4.

CREATE TABLE trilla_lote (
  id_trilla serial PRIMARY KEY,
  id_lote integer NOT NULL REFERENCES lotes_cafe(id_lote) ON DELETE CASCADE,
  ffinal_reposo timestamptz,              -- disp. 6: fecha honesta (NO numeric)
  -- Humedades
  hinicial numeric,
  hfinal numeric,
  -- Rendimientos reales y teóricos (%)
  rfinal_pelado numeric,
  rfinal_seleccion numeric,
  rteorico_pelado numeric,
  rteorico_seleccion numeric,
  -- Balance de masa verde (kg)
  wverde_teorico numeric,
  wverde_final numeric,
  -- Clasificación/granulometría (%)
  psegundas numeric,
  pcataduras numeric,
  pbarreduras numeric,
  pescogeduras numeric,
  pcaracolillo numeric,
  pprimera numeric,
  pmadres numeric,
  pmenudos numeric,
  pinferiores numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT trilla_humedades_rango CHECK (
    COALESCE(hinicial,0) BETWEEN 0 AND 100 AND COALESCE(hfinal,0) BETWEEN 0 AND 100
  ),
  CONSTRAINT trilla_porcentajes_rango CHECK (
    COALESCE(rfinal_pelado,0) BETWEEN 0 AND 100 AND COALESCE(rfinal_seleccion,0) BETWEEN 0 AND 100
    AND COALESCE(rteorico_pelado,0) BETWEEN 0 AND 100 AND COALESCE(rteorico_seleccion,0) BETWEEN 0 AND 100
    AND COALESCE(psegundas,0) BETWEEN 0 AND 100 AND COALESCE(pcataduras,0) BETWEEN 0 AND 100
    AND COALESCE(pbarreduras,0) BETWEEN 0 AND 100 AND COALESCE(pescogeduras,0) BETWEEN 0 AND 100
    AND COALESCE(pcaracolillo,0) BETWEEN 0 AND 100 AND COALESCE(pprimera,0) BETWEEN 0 AND 100
    AND COALESCE(pmadres,0) BETWEEN 0 AND 100 AND COALESCE(pmenudos,0) BETWEEN 0 AND 100
    AND COALESCE(pinferiores,0) BETWEEN 0 AND 100
  ),
  CONSTRAINT trilla_pesos_positivos CHECK (
    COALESCE(wverde_teorico,0) >= 0 AND COALESCE(wverde_final,0) >= 0
  )
);

-- 1:1 identificadora (el PK ES la FK — patrón del snapshot real de CBF)
-- deleted_at: soporta el toggle off del formulario (hotfix aplicado en BD 2026-11-06)
CREATE TABLE peso_verde_trilla (
  id_trilla integer PRIMARY KEY REFERENCES trilla_lote(id_trilla) ON DELETE CASCADE,
  winferiores numeric,
  wfinal numeric,
  wfinal_inferiores numeric,
  deleted_at timestamptz
);

CREATE TRIGGER trg_trilla_updated_at BEFORE UPDATE ON trilla_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_trilla_lote_idx ON trilla_lote (id_lote) WHERE deleted_at IS NULL;
CREATE INDEX idx_trilla_pesos_verdes ON peso_verde_trilla (id_trilla);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE trilla_lote ENABLE ROW LEVEL SECURITY;
CREATE POLICY trilla_select ON trilla_lote FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY trilla_insert ON trilla_lote FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY trilla_update ON trilla_lote FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

ALTER TABLE peso_verde_trilla ENABLE ROW LEVEL SECURITY;
CREATE POLICY peso_verde_select ON peso_verde_trilla FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY peso_verde_insert ON peso_verde_trilla FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY peso_verde_update ON peso_verde_trilla FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

-- ── RPC atómica guardar_trilla (FR-003) ───────────────────────────────────────
-- p_trilla.peso_verde: ausente → no toca · objeto → upsert 1:1 · null explícito
-- → soft-delete de la fila 1:1 activa (semántica del toggle del formulario).
CREATE OR REPLACE FUNCTION guardar_trilla(
  p_id_lote integer,
  p_trilla jsonb
) RETURNS jsonb
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rol text := get_empleado_rol();
  v_trilla_id integer;
  v_pv jsonb;
BEGIN
  IF v_rol NOT IN ('Admin', 'Recepción') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden guardar la trilla';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lotes_cafe WHERE id_lote = p_id_lote AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;

  IF (p_trilla ? 'id_trilla') THEN
    UPDATE trilla_lote SET
      ffinal_reposo     = COALESCE((p_trilla->>'ffinal_reposo')::timestamptz, ffinal_reposo),
      hinicial          = COALESCE((p_trilla->>'hinicial')::numeric, hinicial),
      hfinal            = COALESCE((p_trilla->>'hfinal')::numeric, hfinal),
      rfinal_pelado     = COALESCE((p_trilla->>'rfinal_pelado')::numeric, rfinal_pelado),
      rfinal_seleccion  = COALESCE((p_trilla->>'rfinal_seleccion')::numeric, rfinal_seleccion),
      rteorico_pelado   = COALESCE((p_trilla->>'rteorico_pelado')::numeric, rteorico_pelado),
      rteorico_seleccion = COALESCE((p_trilla->>'rteorico_seleccion')::numeric, rteorico_seleccion),
      wverde_teorico    = COALESCE((p_trilla->>'wverde_teorico')::numeric, wverde_teorico),
      wverde_final      = COALESCE((p_trilla->>'wverde_final')::numeric, wverde_final),
      psegundas         = COALESCE((p_trilla->>'psegundas')::numeric, psegundas),
      pcataduras        = COALESCE((p_trilla->>'pcataduras')::numeric, pcataduras),
      pbarreduras       = COALESCE((p_trilla->>'pbarreduras')::numeric, pbarreduras),
      pescogeduras      = COALESCE((p_trilla->>'pescogeduras')::numeric, pescogeduras),
      pcaracolillo      = COALESCE((p_trilla->>'pcaracolillo')::numeric, pcaracolillo),
      pprimera          = COALESCE((p_trilla->>'pprimera')::numeric, pprimera),
      pmadres           = COALESCE((p_trilla->>'pmadres')::numeric, pmadres),
      pmenudos          = COALESCE((p_trilla->>'pmenudos')::numeric, pmenudos),
      pinferiores       = COALESCE((p_trilla->>'pinferiores')::numeric, pinferiores)
    WHERE id_trilla = (p_trilla->>'id_trilla')::integer
      AND id_lote = p_id_lote AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Trilla no encontrada para este lote';
    END IF;
    v_trilla_id := (p_trilla->>'id_trilla')::integer;
  ELSE
    INSERT INTO trilla_lote (
      id_lote, ffinal_reposo, hinicial, hfinal,
      rfinal_pelado, rfinal_seleccion, rteorico_pelado, rteorico_seleccion,
      wverde_teorico, wverde_final,
      psegundas, pcataduras, pbarreduras, pescogeduras, pcaracolillo,
      pprimera, pmadres, pmenudos, pinferiores
    ) VALUES (
      p_id_lote,
      (p_trilla->>'ffinal_reposo')::timestamptz,
      (p_trilla->>'hinicial')::numeric,
      (p_trilla->>'hfinal')::numeric,
      (p_trilla->>'rfinal_pelado')::numeric,
      (p_trilla->>'rfinal_seleccion')::numeric,
      (p_trilla->>'rteorico_pelado')::numeric,
      (p_trilla->>'rteorico_seleccion')::numeric,
      (p_trilla->>'wverde_teorico')::numeric,
      (p_trilla->>'wverde_final')::numeric,
      (p_trilla->>'psegundas')::numeric,
      (p_trilla->>'pcataduras')::numeric,
      (p_trilla->>'pbarreduras')::numeric,
      (p_trilla->>'pescogeduras')::numeric,
      (p_trilla->>'pcaracolillo')::numeric,
      (p_trilla->>'pprimera')::numeric,
      (p_trilla->>'pmadres')::numeric,
      (p_trilla->>'pmenudos')::numeric,
      (p_trilla->>'pinferiores')::numeric
    );
    v_trilla_id := (SELECT id_trilla FROM trilla_lote
                    WHERE id_lote = p_id_lote ORDER BY id_trilla DESC LIMIT 1);
  END IF;

  -- Sub-entidad 1:1 peso_verde (toggle condicional del formulario)
  IF (p_trilla ? 'peso_verde') THEN
    v_pv := p_trilla->'peso_verde';
    IF v_pv IS NULL OR v_pv = 'null'::jsonb THEN
      UPDATE peso_verde_trilla SET deleted_at = now()
        WHERE id_trilla = v_trilla_id AND deleted_at IS NULL;
    ELSE
      INSERT INTO peso_verde_trilla (id_trilla, winferiores, wfinal, wfinal_inferiores)
      VALUES (
        v_trilla_id,
        (v_pv->>'winferiores')::numeric,
        (v_pv->>'wfinal')::numeric,
        (v_pv->>'wfinal_inferiores')::numeric
      )
      ON CONFLICT (id_trilla) DO UPDATE SET
        winferiores       = COALESCE(EXCLUDED.winferiores, peso_verde_trilla.winferiores),
        wfinal            = COALESCE(EXCLUDED.wfinal, peso_verde_trilla.wfinal),
        wfinal_inferiores = COALESCE(EXCLUDED.wfinal_inferiores, peso_verde_trilla.wfinal_inferiores),
        deleted_at        = NULL;
    END IF;
  END IF;

  RETURN to_jsonb(t.*) FROM trilla_lote t WHERE t.id_trilla = v_trilla_id;
END;
$$;

REVOKE ALL ON FUNCTION guardar_trilla(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION guardar_trilla(integer, jsonb) TO authenticated;
