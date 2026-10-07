import crypto from 'node:crypto';
import connection from './db.js';
import { actualizarPassword } from './consultas.js';
import { revocarSesionesDeUsuario } from './sesiones.js';
import { inTransaction } from './transaction.js';

const TIPO_RESTABLECIMIENTO = 'restablecimiento_password';
const DURACION_ENLACE_MINUTOS = 15;
const URL_RECUPERACION =
  process.env.PASSWORD_RESET_URL ?? 'rn1://restablecer-contrasena';

function crearToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashearToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Crea un enlace nuevo e invalida cualquier enlace de recuperación anterior. */
export async function crearEnlaceRecuperacion(usuarioId) {
  const token = crearToken();

  await connection.query(
    `UPDATE tokens_autenticacion
     SET used_at = UTC_TIMESTAMP()
     WHERE usuario_id = ? AND tipo = ? AND used_at IS NULL`,
    [usuarioId, TIPO_RESTABLECIMIENTO],
  );
  await connection.query(
    `INSERT INTO tokens_autenticacion (usuario_id, tipo, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${DURACION_ENLACE_MINUTOS} MINUTE))`,
    [usuarioId, TIPO_RESTABLECIMIENTO, hashearToken(token)],
  );

  const enlace = new URL(URL_RECUPERACION);
  enlace.searchParams.set('token', token);
  return enlace.toString();
}

/** Cambia la contraseña si el token es válido y revoca todas las sesiones previas. */
export async function restablecerPasswordConToken(token, nuevaPassword) {
  if (!/^[a-f0-9]{64}$/.test(token ?? '')) {
    return { success: false, message: 'El enlace no es válido o expiró' };
  }

  return inTransaction(async (transaction) => {
    const [filas] = await transaction.query(
      `SELECT id, usuario_id
       FROM tokens_autenticacion
       WHERE token_hash = ?
         AND tipo = ?
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()
       LIMIT 1 FOR UPDATE`,
      [hashearToken(token), TIPO_RESTABLECIMIENTO],
    );

    const tokenEncontrado = filas[0];
    if (!tokenEncontrado) {
      return { success: false, message: 'El enlace no es válido o expiró' };
    }

    // La condición evita que el mismo enlace pueda usarse dos veces a la vez.
    const [resultado] = await transaction.query(
      'UPDATE tokens_autenticacion SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL',
      [tokenEncontrado.id],
    );
    if (resultado.affectedRows !== 1) {
      return { success: false, message: 'El enlace no es válido o expiró' };
    }

    const updated = await actualizarPassword(
      tokenEncontrado.usuario_id,
      { password: nuevaPassword },
      transaction,
    );
    if (updated !== 1) throw new Error('No se pudo actualizar la contraseña');
    await revocarSesionesDeUsuario(tokenEncontrado.usuario_id, transaction);
    return { success: true };
  });
}
