import { leerCookie, NOMBRE_COOKIE_SESION } from './sesionesCookie.js';

// An explicit, malformed Authorization header must never fall back to a cookie.
export function obtenerTokenSesion(req) {
  const authorization = req.get('authorization');
  if (authorization !== undefined) {
    return /^Bearer ([a-f0-9]{64})$/i.exec(authorization)?.[1] ?? null;
  }
  return leerCookie(req.headers.cookie, NOMBRE_COOKIE_SESION);
}

export function esClienteNativo(req) {
  return req.get('x-client-platform') === 'native';
}
