-- Tipo de Tueste (de texto libre a dropdown + Otro)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_tueste_enum') THEN
    CREATE TYPE tipo_tueste_enum AS ENUM ('Claro', 'Medio', 'Oscuro');
  END IF;
END
$$;

-- Tipo de Molienda
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_molienda_enum') THEN
    CREATE TYPE tipo_molienda_enum AS ENUM ('Fina', 'Media', 'Gruesa', 'Grano Entero');
  END IF;
END
$$;

-- Tipo de Empaque
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_empaque_enum') THEN
    CREATE TYPE tipo_empaque_enum AS ENUM (
      'Bolsa con válvula 500g',
      'Bolsa con válvula 1Kg',
      'Bolsa 5Kg',
      'Saco 46Kg',
      'A granel'
    );
  END IF;
END
$$;
