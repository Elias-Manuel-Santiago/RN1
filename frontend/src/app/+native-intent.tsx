// Auth0 owns its callback URL; Expo Router should return to the session-aware home screen.
// Keep password-reset links reachable on both cold starts and an already-open app.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'rn1://app');
    if (url.protocol === 'rn1:' && url.hostname === process.env.EXPO_PUBLIC_AUTH0_DOMAIN
      && /^\/(ios|android)\/com\.elias\.rn1\/callback$/.test(url.pathname)) return '/';
    if (url.protocol === 'rn1:' && url.hostname === 'restablecer-contrasena') {
      return `/restablecer-contrasena${url.search}`;
    }
    return path;
  } catch { return '/'; }
}
