-- Semilla inicial de zonas de procedencia del café
INSERT INTO zonas_finca (nombre) VALUES
  ('Tarrazú'),
  ('Los Santos'),
  ('Valle Central'),
  ('Brunca'),
  ('Turrialba'),
  ('Orosi'),
  ('Pérez Zeledón')
ON CONFLICT (nombre) DO NOTHING;
