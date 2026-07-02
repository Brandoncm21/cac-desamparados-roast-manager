-- ============================================================
-- SCACR - Seed de datos de prueba
-- ============================================================

-- EMPLEADOS (4 roles)
INSERT INTO empleados (nombre, rol, activo) VALUES
  ('Admin SCACR', 'Admin', TRUE),
  ('Carlos Tostador', 'Tostador', TRUE),
  ('María Recepción', 'Recepción', TRUE),
  ('Pedro Operador', 'Operador', TRUE);

-- CLIENTES
INSERT INTO clientes (nombre_completo, telefono, zona_procedencia) VALUES
  ('Finca San Luis', '8888-1111', 'Tarrazú'),
  ('Cooperativa Los Santos', '8888-2222', 'Los Santos'),
  ('Beneficio El Valle', '8888-3333', 'Valle Central'),
  ('Cafetalera Doña Ana', '8888-4444', 'Brunca'),
  ('Hacienda La Amistad', '8888-5555', 'Turrialba');

-- ÓRDENES DE TRABAJO
INSERT INTO ordenes_trabajo (num_talonario_fisico, id_cliente, num_factura, porcentaje_humedad_entrada, proceso_cafe, descripcion_producto, id_empleado_recibe, id_empleado_entrega, estado_orden, firma_aprobacion_cliente) VALUES
  ('0451', 1, 'FAC-2026-001', 12.5, 'Lavado', 'Café especialidad Tarrazú SHB', 3, 4, 'Completado', TRUE),
  ('0452', 2, 'FAC-2026-002', 11.8, 'Honey', 'Café honey process Los Santos', 3, 4, 'En Proceso', TRUE),
  ('0453', 3, NULL, 13.2, 'Natural', 'Café natural Valle Central - lote experimental', 3, 4, 'Pendiente', FALSE);

-- SERVICIOS EJECUTADOS
INSERT INTO servicios_ejecutados (id_orden, tipo_servicio, peso_inicial, precio, id_operador) VALUES
  (1, 'Chancado', 500, 15000, 4),
  (1, 'Trillado', 480, 25000, 4),
  (1, 'Tueste', 460, 35000, 2),
  (1, 'Empacado', 420, 8000, 4),
  (2, 'Trillado', 300, 18000, 4),
  (2, 'Tueste', 285, 22000, 2);

-- ESPECIFICACIONES
INSERT INTO especificaciones_orden (id_orden, tipo_tueste, tipo_molienda, tipo_empaque, observaciones) VALUES
  (1, 'Media', 'Fina', 'Bolsa al vacío 1kg', 'Entregar antes del 15/07'),
  (2, 'Oscura', 'Gruesa', 'Costal 25kg', 'Cliente prefiere grano entero');

-- PERFILES DE TUESTE
INSERT INTO perfiles_tueste (id_orden, numero_lote, fecha_tueste, id_tostador, nombre_cafe, temperatura_sala, humedad_sala) VALUES
  (1, 'LOTE-001', '2026-06-15', 2, 'Tarrazú SHB - San Luis', 22.5, 65),
  (1, 'LOTE-002', '2026-06-20', 2, 'Tarrazú SHB - San Luis (2da partida)', 23.0, 68),
  (2, 'LOTE-003', '2026-06-22', 2, 'Honey Los Santos', 21.8, 70);

-- HITOS TÉRMICOS (perfil 1 - lote 001)
INSERT INTO hitos_termicos (id_perfil, tipo_hito, tiempo_min, temperatura) VALUES
  (1, 'Turning Point', 1.5, 100),
  (1, 'Amarillo', 4.0, 140),
  (1, 'Marrón', 7.0, 170),
  (1, 'Crack Inicial', 10.5, 195),
  (1, 'Crack Final', 12.0, 205),
  (1, 'Final', 13.5, 210),
  (1, 'Tiempo Enfriamiento', 15.0, 80);

-- TRAZABILIDAD TEMPERATURA (perfil 1 - minuto a minuto)
INSERT INTO trazabilidad_temperatura (id_perfil, minuto, temperatura_registrada) VALUES
  (1, 0, 22.0), (1, 1, 70.0), (1, 2, 110.0), (1, 3, 130.0),
  (1, 4, 142.0), (1, 5, 150.0), (1, 6, 162.0), (1, 7, 172.0),
  (1, 8, 180.0), (1, 9, 188.0), (1, 10, 194.0), (1, 11, 200.0),
  (1, 12, 205.0), (1, 13, 210.0), (1, 14, 80.0);

-- HITOS TÉRMICOS (perfil 2 - lote 002)
INSERT INTO hitos_termicos (id_perfil, tipo_hito, tiempo_min, temperatura) VALUES
  (2, 'Turning Point', 1.8, 102),
  (2, 'Amarillo', 4.5, 142),
  (2, 'Marrón', 7.5, 172),
  (2, 'Crack Inicial', 11.0, 196),
  (2, 'Crack Final', 12.5, 206),
  (2, 'Final', 14.0, 211);

-- TRAZABILIDAD TEMPERATURA (perfil 2)
INSERT INTO trazabilidad_temperatura (id_perfil, minuto, temperatura_registrada) VALUES
  (2, 0, 23.0), (2, 1, 72.0), (2, 2, 112.0), (2, 3, 132.0),
  (2, 4, 144.0), (2, 5, 152.0), (2, 6, 164.0), (2, 7, 174.0),
  (2, 8, 182.0), (2, 9, 190.0), (2, 10, 196.0), (2, 11, 202.0),
  (2, 12, 206.0), (2, 13, 210.0), (2, 14, 211.0);

-- HITOS TÉRMICOS (perfil 3 - lote 003)
INSERT INTO hitos_termicos (id_perfil, tipo_hito, tiempo_min, temperatura) VALUES
  (3, 'Turning Point', 1.6, 101),
  (3, 'Amarillo', 4.2, 141),
  (3, 'Marrón', 7.2, 171),
  (3, 'Crack Inicial', 10.8, 195),
  (3, 'Final', 13.8, 210);

-- TRAZABILIDAD TEMPERATURA (perfil 3)
INSERT INTO trazabilidad_temperatura (id_perfil, minuto, temperatura_registrada) VALUES
  (3, 0, 21.8), (3, 1, 71.0), (3, 2, 111.0), (3, 3, 131.0),
  (3, 4, 143.0), (3, 5, 151.0), (3, 6, 163.0), (3, 7, 173.0),
  (3, 8, 181.0), (3, 9, 189.0), (3, 10, 195.0), (3, 11, 201.0),
  (3, 12, 206.0), (3, 13, 210.0);

-- MÉTRICAS TUESTE (perfil 1)
INSERT INTO metricas_tueste (id_perfil, tipo_metrica, valor_antes, valor_despues) VALUES
  (1, 'Peso', 100.000, 84.000),
  (1, 'Humedad', 12.500, 3.200),
  (1, 'Densidad', 680.000, 420.000);
