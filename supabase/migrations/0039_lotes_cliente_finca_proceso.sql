-- 0039_lotes_cliente_finca_proceso.sql
-- Referencia: specs/004-refactor-flujo-lotes (D3, D9, P1, P2, P4, FR-002/003/004/005).
-- Columnas nuevas nullable: se rellenan en 0041 (backfill) antes de exigir NOT NULL.

ALTER TABLE public.lotes_cafe
  ADD COLUMN id_cliente   integer REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  ADD COLUMN id_finca     integer REFERENCES public.fincas(id_finca) ON DELETE RESTRICT,
  ADD COLUMN proceso_cafe public.proceso_cafe_enum;

ALTER TABLE public.ordenes_trabajo
  ADD COLUMN id_finca integer REFERENCES public.fincas(id_finca) ON DELETE SET NULL;

-- El lote puede entrar en catación.
ALTER TABLE public.lotes_cafe DROP CONSTRAINT lotes_cafe_enproceso_check;
ALTER TABLE public.lotes_cafe ADD CONSTRAINT lotes_cafe_enproceso_check
  CHECK (enproceso IN ('No','En Secado','En Trilla','En Bodega','En Catación','Vendido'));

CREATE INDEX idx_lotes_cliente ON public.lotes_cafe (id_cliente);
CREATE INDEX idx_lotes_finca ON public.lotes_cafe (id_finca);
CREATE INDEX idx_ordenes_finca ON public.ordenes_trabajo (id_finca);
