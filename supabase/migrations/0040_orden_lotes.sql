-- 0040_orden_lotes.sql
-- Referencia: specs/004-refactor-flujo-lotes (D4, FR-006). Reemplaza el enlace por texto
-- de orden_lotes_externos por un puente N:M por id.

CREATE TABLE public.orden_lotes (
  id_orden   integer NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
  id_lote    integer NOT NULL REFERENCES public.lotes_cafe(id_lote) ON DELETE CASCADE,
  peso_kg    numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_orden, id_lote)
);

CREATE INDEX idx_orden_lotes_lote ON public.orden_lotes (id_lote);

ALTER TABLE public.orden_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY orden_lotes_select ON public.orden_lotes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY orden_lotes_insert ON public.orden_lotes
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Admin', 'Recepción'));

CREATE POLICY orden_lotes_delete ON public.orden_lotes
  FOR DELETE TO authenticated
  USING (get_empleado_rol() IN ('Admin', 'Recepción'));

REVOKE ALL ON public.orden_lotes FROM anon;
GRANT SELECT, INSERT, DELETE ON public.orden_lotes TO authenticated;
