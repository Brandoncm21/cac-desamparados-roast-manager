-- 0041_backfill_relaciones.sql
-- Referencia: specs/004-refactor-flujo-lotes (FR-008, P5). Idempotente.
-- Incluye el fix de una secuencia desincronizada preexistente detectada por el backfill:
-- clientes.id_cliente había sido poblado con ids explícitos y la secuencia quedó en 1,
-- por lo que cualquier INSERT nuevo colisionaba en la PK.

SELECT setval(
  'public.clientes_id_cliente_seq',
  (SELECT COALESCE(max(id_cliente), 1) FROM public.clientes)
);

-- 1) Clientes por nombre (distingue activos: permite reusar nombre tras soft-delete).
INSERT INTO public.clientes (nombre_completo)
SELECT DISTINCT l.nproductor
FROM public.lotes_cafe l
WHERE l.nproductor IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.nombre_completo = l.nproductor AND c.deleted_at IS NULL
  );

-- 2) Fincas por (cliente, nfinca); altura del lote, zona por nombre si existe.
INSERT INTO public.fincas (cliente_id, nombre, zona_id, altura)
SELECT DISTINCT ON (c.id_cliente, l.nfinca)
       c.id_cliente,
       l.nfinca,
       z.id_zona,
       COALESCE(l.altura, 0)
FROM public.lotes_cafe l
JOIN public.clientes c ON c.nombre_completo = l.nproductor AND c.deleted_at IS NULL
LEFT JOIN public.zonas_finca z ON z.nombre = l.zona
WHERE l.nfinca IS NOT NULL AND l.nfinca <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.fincas f
    WHERE f.cliente_id = c.id_cliente AND f.nombre = l.nfinca AND f.deleted_at IS NULL
  )
ORDER BY c.id_cliente, l.nfinca, l.id_lote;

-- 3) Enlazar lotes a cliente (productor) y finca.
UPDATE public.lotes_cafe l
SET id_cliente = c.id_cliente,
    id_finca = (
      SELECT f.id_finca
      FROM public.fincas f
      WHERE f.cliente_id = c.id_cliente AND f.nombre = l.nfinca AND f.deleted_at IS NULL
      LIMIT 1
    )
FROM public.clientes c
WHERE c.nombre_completo = l.nproductor
  AND c.deleted_at IS NULL
  AND l.id_cliente IS NULL;

-- 4) Migrar el puente de texto a id (sin-match se reporta, no se descarta).
INSERT INTO public.orden_lotes (id_orden, id_lote, peso_kg)
SELECT o.id_orden, l.id_lote, o.peso_kg
FROM public.orden_lotes_externos o
JOIN public.lotes_cafe l ON l.nlote = o.nlote
ON CONFLICT (id_orden, id_lote) DO NOTHING;
