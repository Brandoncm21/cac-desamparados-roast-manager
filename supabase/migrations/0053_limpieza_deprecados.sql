-- 0053 - Limpieza de deprecados (F5)
--
-- `fincas.cliente_id` quedó deprecado en 0050: la finca pertenece al productor
-- (productor_id). La unicidad por productor ya existe como
-- `fincas_productor_nombre_key`, así que no hay que recrearla.
--
-- Los índices `fincas_cliente_nombre_key` e `idx_fincas_cliente` caen con la
-- columna.

ALTER TABLE public.fincas DROP COLUMN IF EXISTS cliente_id;
