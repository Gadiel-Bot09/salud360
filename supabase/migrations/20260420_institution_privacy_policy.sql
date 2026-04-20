-- Añadir columna de políticas de privacidad a institutions
ALTER TABLE institutions ADD COLUMN privacy_policy TEXT;

-- Opcional: Agregar un comentario para documentar la columna
COMMENT ON COLUMN institutions.privacy_policy IS 'Política de tratamiento de datos personales de la institución.';
