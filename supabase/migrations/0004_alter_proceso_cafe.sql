-- Proceso de café ya no es obligatorio
ALTER TABLE ordenes_trabajo ALTER COLUMN proceso_cafe DROP NOT NULL;
ALTER TABLE ordenes_trabajo ALTER COLUMN proceso_cafe DROP DEFAULT;

-- Hora de cierre para el responsable de la orden
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS hora_cierre TIME;
