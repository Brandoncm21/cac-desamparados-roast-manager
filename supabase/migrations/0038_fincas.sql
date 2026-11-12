-- 0038_fincas.sql
-- Tabla de fincas: 1 cliente → N fincas, con altura obligatoria (masl) y zona opcional.
-- Referencia: specs/004-refactor-flujo-lotes (D1, D2, P4, FR-001).

CREATE TABLE public.fincas (
  id_finca   serial PRIMARY KEY,
  cliente_id integer NOT NULL REFERENCES public.clientes(id_cliente) ON DELETE RESTRICT,
  nombre     varchar(150) NOT NULL,
  zona_id    integer REFERENCES public.zonas_finca(id_zona) ON DELETE SET NULL,
  altura     numeric(10,2) NOT NULL CHECK (altura >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Único nombre activo por cliente (permite reutilizar nombre tras soft-delete).
CREATE UNIQUE INDEX fincas_cliente_nombre_key ON public.fincas (cliente_id, nombre)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_fincas_cliente ON public.fincas (cliente_id);
CREATE INDEX idx_fincas_zona ON public.fincas (zona_id);

CREATE TRIGGER trg_fincas_updated_at
  BEFORE UPDATE ON public.fincas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.fincas ENABLE ROW LEVEL SECURITY;

CREATE POLICY fincas_select ON public.fincas
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY fincas_insert ON public.fincas
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Admin', 'Recepción'));

CREATE POLICY fincas_update ON public.fincas
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Admin', 'Recepción'))
  WITH CHECK (true);

REVOKE ALL ON public.fincas FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.fincas TO authenticated;
