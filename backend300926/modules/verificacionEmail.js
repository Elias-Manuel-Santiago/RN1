import crypto from 'node:crypto';
import connection from './db.js';

const TIPO_VERIFICACION_EMAIL = 'verificacion_email';
const DURACION_CODIGO_MS = 60 * 1000;

function crearCodigo() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashearCodigo(codigo) {
  return crypto.createHash('sha256').update(codigo).digest('hex');
}

/** Crea un código nuevo e invalida los códigos anteriores del mismo usuario. */
export async function crearCodigoVerificacion(usuarioId) {
  const codigo = crearCodigo();

  await connection.query(
    `UPDATE tokens_autenticacion
     SET used_at = UTC_TIMESTAMP()
     WHERE usuario_id = ? AND tipo = ? AND used_at IS NULL`,
    [usuarioId, TIPO_VERIFICACION_EMAIL],
  );

  await connection.query(
    `INSERT INTO tokens_autenticacion (usuario_id, tipo, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 MINUTE))`,
    [usuarioId, TIPO_VERIFICACION_EMAIL, hashearCodigo(codigo)],
  );

  return {
    codigo,
    // El contador se calcula en el navegador; esta fecha coincide con el minuto guardado en MySQL.
    expiresAt: new Date(Date.now() + DURACION_CODIGO_MS).toISOString(),
  };
}

/** Verifica un código activo y marca el correo como confirmado si es correcto. */
export async function verificarCodigoVerificacion(usuarioId, codigo) {
  const [filas] = await connection.query(
    `SELECT id, token_hash
     FROM tokens_autenticacion
     WHERE usuario_id = ?
       AND tipo = ?
       AND used_at IS NULL
       AND expires_at > UTC_TIMESTAMP()
     ORDER BY created_at DESC
     LIMIT 1`,
    [usuarioId, TIPO_VERIFICACION_EMAIL],
  );

  const token = filas[0];
  if (!token || hashearCodigo(codigo) !== token.token_hash) {
    return { success: false, message: 'El código es incorrecto o expiró' };
  }

  await connection.query(
    'UPDATE tokens_autenticacion SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL',
    [token.id],
  );
  await connection.query(
    'UPDATE usuarios SET email_verified_at = UTC_TIMESTAMP() WHERE id = ?',
    [usuarioId],
  );

  return { success: true };
}
