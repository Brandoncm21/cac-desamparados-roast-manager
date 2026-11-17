-- 0049 — Vista de lotes con su estado de catación
--
-- La pantalla de catación pregunta "¿este lote se cató?", así que la lista se
-- pagina sobre lotes y no sobre registros de catación. `security_invoker` hace
-- que la vista respete las políticas RLS de las tablas base.

CREATE OR REPLACE VIEW public.v_lotes_catacion
WITH (security_invoker = true) AS
SELECT
  l.id_lote,
  l.nlote,
  l.enproceso,
  l.fecha_acopio,
  l.id_cliente,
  l.id_finca,
  cl.nombre_completo AS cliente,
  fi.nombre AS finca,
  ct.id_catacion_tueste,
  COALESCE(ct.catado, false) AS catado,
  ct.notas_catacion,
  ct.updated_at AS catacion_actualizada_at
FROM public.lotes_cafe l
LEFT JOIN public.catacion_tueste ct
  ON ct.id_lote = l.id_lote AND ct.deleted_at IS NULL
LEFT JOIN public.clientes cl ON cl.id_cliente = l.id_cliente
LEFT JOIN public.fincas fi ON fi.id_finca = l.id_finca
WHERE l.deleted_at IS NULL;

REVOKE ALL ON public.v_lotes_catacion FROM PUBLIC, anon;
GRANT SELECT ON public.v_lotes_catacion TO authenticated, service_role;
