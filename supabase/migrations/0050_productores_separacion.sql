-- 0050 — Separación Clientes / Productores (F0 + F1)
--
-- Fase aditiva: no se borra nada. `clientes` queda para el flujo de Órdenes y
-- `productores` nace como entidad independiente del flujo de Beneficiado.
--
-- El vínculo de trazabilidad entre ambos se preserva copiando `public_id`
-- (conector K2): así se sabe de qué cliente provino cada productor sin dejar
-- una FK que vuelva a acoplar las entidades.

-- ── F0: tabla de productores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.productores (
  id_productor    serial PRIMARY KEY,
  nombre_completo VARCHAR NOT NULL,
  telefono        VARCHAR,
  fecha_registro  TIMESTAMPTZ NOT NULL DEFAULT now(),
  public_id       UUID NOT NULL DEFAULT gen_random_uuid(),
  external_ref    VARCHAR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS productores_public_id_key
  ON public.productores (public_id);

CREATE INDEX IF NOT EXISTS idx_productores_nombre_trgm
  ON public.productores USING gin (nombre_completo gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_productores_activos
  ON public.productores (nombre_completo)
  WHERE deleted_at IS NULL;

-- Copia de los 6 clientes actuales conservando public_id (idempotente).
INSERT INTO public.productores (
  nombre_completo, telefono, fecha_registro, public_id, external_ref, deleted_at
)
SELECT c.nombre_completo, c.telefono, c.fecha_registro, c.public_id, c.external_ref, c.deleted_at
FROM public.clientes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.productores p WHERE p.public_id = c.public_id
);

ALTER TABLE public.productores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS productores_select ON public.productores;
CREATE POLICY productores_select ON public.productores
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS productores_insert ON public.productores;
CREATE POLICY productores_insert ON public.productores
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() = ANY (ARRAY['Recepción', 'Admin']));

DROP POLICY IF EXISTS productores_update ON public.productores;
CREATE POLICY productores_update ON public.productores
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() = ANY (ARRAY['Recepción', 'Admin']))
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.productores TO authenticated;
GRANT ALL ON public.productores TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.productores_id_productor_seq TO authenticated, service_role;

-- ── F1: la finca pertenece al productor ──────────────────────────────────────
-- `fincas.cliente_id` se conserva temporalmente (NOT NULL) para no romper el
-- código que aún lo usa; queda deprecado y se retira en una fase posterior.
ALTER TABLE public.fincas ADD COLUMN IF NOT EXISTS productor_id INTEGER;

UPDATE public.fincas f
SET productor_id = p.id_productor
FROM public.clientes c
JOIN public.productores p ON p.public_id = c.public_id
WHERE f.cliente_id = c.id_cliente
  AND f.productor_id IS NULL;

ALTER TABLE public.fincas ALTER COLUMN productor_id SET NOT NULL;

ALTER TABLE public.fincas
  DROP CONSTRAINT IF EXISTS fincas_productor_id_fkey;
ALTER TABLE public.fincas
  ADD CONSTRAINT fincas_productor_id_fkey
  FOREIGN KEY (productor_id) REFERENCES public.productores(id_productor)
  ON DELETE RESTRICT;

-- Una finca no puede repetirse dentro del mismo productor.
CREATE UNIQUE INDEX IF NOT EXISTS fincas_productor_nombre_key
  ON public.fincas (productor_id, nombre)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fincas_productor
  ON public.fincas (productor_id);
