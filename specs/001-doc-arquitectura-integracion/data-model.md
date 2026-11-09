# Data Model: Integración CafeTrack ↔ CoffeeBeanFlow

**Feature**: `001-doc-arquitectura-integracion`

## ER dual (esqueleto)

### CafeTrack — 16 tablas (fuente: catálogo PostgreSQL con 24 migraciones aplicadas)

Relaciones y ON DELETE verificados vía `pg_constraint` (detalle completo en §2 del documento principal):

```mermaid
erDiagram
    clientes ||--o{ ordenes_trabajo : "id_cliente (RESTRICT)"
    empleados ||--o{ ordenes_trabajo : "recibe/entrega (NO ACTION)"
    ordenes_trabajo ||--|| especificaciones_orden : "id_orden UNIQUE (CASCADE)"
    ordenes_trabajo ||--o{ orden_pasos : "id_orden (CASCADE)"
    ordenes_trabajo ||--o{ servicios_ejecutados : "id_orden (CASCADE)"
    ordenes_trabajo ||--o{ perfiles_tueste : "id_orden (SET NULL)"
    empleados ||--o{ perfiles_tueste : "id_tostador (NO ACTION)"
    empleados ||--o{ servicios_ejecutados : "id_operador (NO ACTION)"
    empleados ||--o{ orden_pasos : "operadores inicio/cierre (NO ACTION)"
    servicios_maestro ||--o{ orden_pasos : "servicio_id (NO ACTION)"
    servicios_maestro ||--o{ servicios_ejecutados : "servicio_id (NO ACTION)"
    servicios_maestro ||--o{ servicio_precios : "id_servicio (CASCADE)"
    servicio_precios ||--o{ orden_pasos : "tarifa_id (NO ACTION)"
    empaques ||--o{ orden_pasos : "empaque_id (NO ACTION)"
    empaques ||--o{ servicios_ejecutados : "empaque_id (NO ACTION)"
    empaques ||--o{ empaque_precios : "id_empaque (CASCADE)"
    perfiles_tueste ||--o{ trazabilidad_temperatura : "id_perfil (CASCADE)"
    perfiles_tueste ||--o{ metricas_tueste : "id_perfil (CASCADE)"
    perfiles_tueste ||--o{ hitos_termicos : "id_perfil (CASCADE)"
    perfiles_tueste ||--o{ ajustes_tueste : "id_perfil (CASCADE)"
    perfiles_tueste ||--o{ orden_pasos : "id_perfil_tueste (NO ACTION)"
    empleados ||--o| empleados : "id_auth UNIQUE -> auth.users (SET NULL)"
    auth_users ||--o{ empaque_precios : "creado_por (NO ACTION)"
```

Nota: `auth_users` es el stub de `auth.users` (Supabase Auth). `empleados` y `empaque_precios` son las únicas tablas que referencian a Auth.

### CoffeeBeanFlow — 19 tablas (fuente: §2.1–2.20 de la spec externa)

```mermaid
erDiagram
    area_acopio ||--o{ secado : "nlote (RESTRICT)"
    area_acopio ||--o{ bodega : "nlote (RESTRICT)"
    area_acopio ||--o{ trilla : "nlote (RESTRICT)"
    area_acopio ||--o{ formulario_caracterizacion : "nlote_area_acopio (RESTRICT)"
    secado ||--o{ humedad : "id_secado (CASCADE)"
    secado ||--o{ termo_higrometria : "id_secado (CASCADE)"
    secado ||--o{ temperatura_secado : "id_secado (CASCADE)"
    secado ||--o{ ncama : "id_secado (CASCADE)"
    secado }o--o{ bodega : "guardar_cafe (N:M cantidad_sacos)"
    trilla ||--|| peso_verde : "id_peso_verde = id_trilla (1:1 CASCADE)"
    formulario_caracterizacion ||--|| rc_maduras : "tiempo UNIQUE (CASCADE)"
    formulario_caracterizacion ||--|| rc_inmaduras : "tiempo UNIQUE (CASCADE)"
    formulario_caracterizacion ||--|| rc_sobremaduras : "tiempo UNIQUE (CASCADE)"
    catacion ||--o{ rondas : "id_catacion (CASCADE)"
    trilla }o--o{ catacion : "enviar_muestras (N:M ffinal_reposo)"
    bodega }o--o{ trilla : "suministra (N:M)"
    area_acopio ||..o{ catacion : "nlote SIN FK (texto)"
```

## Pipeline unificado (esqueleto — detalle y eventos en §4.7)

1. **CBF**: acopio → caracterización → secado → bodega → trilla
2. **Handoff**: trilla con `wverde_final` → crear orden CafeTrack (via `orden_lotes_externos` K1)
3. **CafeTrack**: chancado/tueste/molido/empacado (orden_pasos, RPCs 0024)
4. **Handoff inverso**: perfil tueste `Completado` → catación CBF (via `public_id` K2 + `perfil_tueste_ref` K3)
5. **Cierre**: catación → `vendido` en CBF / factura en CafeTrack (`numero_factura` solo referencia legible, K6)

## Contratos de claves (K1–K6, detalle §4.3)

| Clave | Mecanismo | Dato que viaja |
|---|---|---|
| K1 | Tabla puente `orden_lotes_externos(id_orden, nlote, peso_kg, origen)` PK compuesta | lote físico ↔ orden |
| K2 | `public_id uuid DEFAULT gen_random_uuid() UNIQUE` en `ordenes_trabajo`, `perfiles_tueste`, `clientes` | ID estable inter-sistema |
| K3 | `perfil_tueste_ref` (uuid) en la futura tabla de catación → `perfiles_tueste.public_id` | tueste ↔ catación |
| K4 | `clientes.external_ref varchar(100)` + conciliación manual | productor CBF ↔ cliente |
| K5 | UNIQUE (`external_ref`, `origen`) en tablas receptoras | idempotencia de carga |
| K6 | `numero_factura` solo como referencia legible | factura |
