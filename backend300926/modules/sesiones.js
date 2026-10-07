import crypto from 'node:crypto';
import connection from './db.js';

export const NOMBRE_COOKIE_SESION = 'sesion_id';
export const DURACION_SESION_DIAS = 30;

/** Genera un token aleatorio apto para enviarse en una cookie. */
function crearToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Nunca guardamos el token real: solo este hash irreversible. */
function hashearToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Crea una sesión persistente y devuelve el token que se enviará al navegador. */
export async function crearSesion(usuarioId, { userAgent, ipAddress }) {
  const token = crearToken();
  const tokenHash = hashearToken(token);

  await connection.query(
    `INSERT INTO sesiones_usuario
      (usuario_id, token_hash, expires_at, created_at, user_agent, ip_address)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${DURACION_SESION_DIAS} DAY), UTC_TIMESTAMP(), ?, ?)`,
    [
      usuarioId,
      tokenHash,
      userAgent?.slice(0, 255) ?? null,
      ipAddress?.slice(0, 45) ?? null,
    ],
  );

  return token;
}

/** Obtiene el usuario dueño de una sesión activa y actualiza su último uso. */
export async function obtenerUsuarioPorSesion(token) {
  if (!/^[a-f0-9]{64}$/.test(token ?? '')) return null;

  const tokenHash = hashearToken(token);
  const [filas] = await connection.query(
    `SELECT u.id, u.username, u.email, u.email_verified_at
     FROM sesiones_usuario AS s
     INNER JOIN usuarios AS u ON u.id = s.usuario_id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > UTC_TIMESTAMP()`,
    [tokenHash],
  );

  if (!filas[0]) return null;

  await connection.query(
    'UPDATE sesiones_usuario SET last_seen_at = UTC_TIMESTAMP() WHERE token_hash = ?',
    [tokenHash],
  );

  return filas[0];
}

/** Revoca la sesión actual al cerrar sesión. */
export async function revocarSesion(token) {
  if (!/^[a-f0-9]{64}$/.test(token ?? '')) return;

  await connection.query(
    'UPDATE sesiones_usuario SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked_at IS NULL',
    [hashearToken(token)],
  );
}

/** Revoca todas las sesiones después de un restablecimiento de contraseña. */
export async function revocarSesionesDeUsuario(usuarioId) {
  await connection.query(
    'UPDATE sesiones_usuario SET revoked_at = UTC_TIMESTAMP() WHERE usuario_id = ? AND revoked_at IS NULL',
    [usuarioId],
  );
}

/** Lee una cookie concreta sin añadir dependencias externas. */
export function leerCookie(cabeceraCookie, nombre) {
  const cookie = cabeceraCookie
    ?.split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nombre}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(nombre.length + 1));
  } catch {
    return null;
  }
}

/** Configuración común: JavaScript no puede acceder a la cookie de sesión. */
export function opcionesCookieSesion() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DURACION_SESION_DIAS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
