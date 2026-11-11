-- 0043_backfill_catacion_id_lote.sql
-- Feature 004 (refactor flujo lotes) — T11
-- Las cataciones creadas antes de 0039 quedaron con nlote pero sin id_lote.
-- Se completa el FK por nlote (idempotente: solo filas con id_lote IS NULL).

UPDATE public.catacion_tueste ct
   SET id_lote = l.id_lote
  FROM public.lotes_cafe l
 WHERE ct.id_lote IS NULL
   AND ct.nlote = l.nlote
   AND ct.deleted_at IS NULL
   AND l.deleted_at IS NULL;
