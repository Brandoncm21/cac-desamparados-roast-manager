-- 0034_performance_indices_fk_y_rls_initplan.sql
-- 1) Índices de cobertura para las 9 FKs marcadas por el advisor
--    `unindexed_foreign_keys`.
-- 2) `auth_rls_initplan`: auth.uid() evaluado una sola vez por consulta, no por
--    fila. Mismos roles/cmd/expresión; solo se envuelve la llamada en (select …).
-- Aplicado en producción vía MCP con el nombre `performance_indices_fk_y_rls_initplan`.

create index if not exists idx_empaque_precios_creado_por on public.empaque_precios (creado_por);
create index if not exists idx_orden_pasos_empaque_id on public.orden_pasos (empaque_id);
create index if not exists idx_orden_pasos_operador_cierre on public.orden_pasos (id_operador_cierre);
create index if not exists idx_orden_pasos_operador_inicio on public.orden_pasos (id_operador_inicio);
create index if not exists idx_orden_pasos_servicio_id on public.orden_pasos (servicio_id);
create index if not exists idx_ordenes_empleado_entrega on public.ordenes_trabajo (id_empleado_entrega);
create index if not exists idx_ordenes_empleado_recibe on public.ordenes_trabajo (id_empleado_recibe);
create index if not exists idx_perfiles_tostador on public.perfiles_tueste (id_tostador);
create index if not exists idx_servicios_operador on public.servicios_ejecutados (id_operador);

drop policy if exists empleados_lectura_propia on public.empleados;
create policy empleados_lectura_propia on public.empleados
  as permissive for select to public
  using (id_auth = (select auth.uid()));
