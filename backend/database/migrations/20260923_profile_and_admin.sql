-- Migración para la base `usuarios` (MariaDB 10.4+).
-- Añade soporte para foto de perfil y rol administrador sin eliminar datos.

START TRANSACTION;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `profile_picture` MEDIUMTEXT NULL AFTER `email_verified_at`,
  ADD COLUMN IF NOT EXISTS `is_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER `profile_picture`;

COMMIT;

-- Después de importarla, crea el primer administrador sin guardar una contraseña
-- en este archivo:
--   cd backend
--   npm run create-admin -- <username> <email> <contraseña>
--
-- Para promover una cuenta local ya existente, ejecuta una única vez:
--   UPDATE usuarios SET is_admin = 1 WHERE email = 'cuenta@ejemplo.com';
