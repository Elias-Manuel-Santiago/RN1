export const NOMBRE_COOKIE_SESION = 'sesion_id';

export function leerCookie(cabeceraCookie, nombre) {
  const cookie = cabeceraCookie?.split(';').map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nombre}=`));
  if (!cookie) return null;
  try { return decodeURIComponent(cookie.slice(nombre.length + 1)); }
  catch { return null; }
}
