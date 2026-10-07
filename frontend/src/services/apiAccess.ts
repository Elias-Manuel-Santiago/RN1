import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AdminUser, User } from '@/types/user';
import { clearSession, readSession, saveSession } from './session-storage';

function apiUrl() {
  // A phone needs the PC's LAN address; the browser can keep localhost for cookies.
  const nativeUrl = Platform.OS !== 'web' ? process.env.EXPO_PUBLIC_NATIVE_API_URL?.trim() : undefined;
  const configured = nativeUrl || process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (!__DEV__) throw new ApiError('Falta configurar la dirección del servidor.', 0);
  if (Platform.OS === 'web') return 'http://localhost:3005/api';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')}:3005/api`;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}
export type AuthenticatedResponse = { usuario: User; verificationExpiresAt: string | null; sessionToken?: string };
const expiredListeners = new Set<() => void>();
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}
export const clearLocalSession = clearSession;

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const token = Platform.OS !== 'web' && authenticated ? await readSession() : null;
  if (Platform.OS !== 'web' && authenticated && !token) throw new ApiError('Debes iniciar sesión.', 401);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body) headers.set('Content-Type', 'application/json');
    if (Platform.OS !== 'web') headers.set('X-Client-Platform', 'native');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${apiUrl()}${path}`, {
      ...options, headers, signal: controller.signal,
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        await clearSession();
        expiredListeners.forEach((listener) => listener());
      }
      throw new ApiError(data?.message ?? data?.error ?? 'No se pudo completar la petición.', response.status);
    }
    if (data === null) throw new ApiError('El servidor devolvió una respuesta inválida.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'El servidor tardó demasiado. Intenta nuevamente.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.', 0);
  } finally { clearTimeout(timeout); }
}
async function authenticate(path: string, body: unknown) {
  const response = await request<AuthenticatedResponse>(path, { method: 'POST', body: JSON.stringify(body) }, false);
  if (Platform.OS !== 'web') {
    if (!response.sessionToken || !/^[a-f0-9]{64}$/.test(response.sessionToken)) {
      throw new ApiError('El servidor no admite sesiones móviles. Actualiza el backend de RN1.', 0);
    }
    await saveSession(response.sessionToken);
  }
  return response;
}
export const login = (identifier: string, password: string) => authenticate('/login', { identifier: identifier.trim(), password });
export const register = (username: string, email: string, password: string) => authenticate('/personas', { username: username.trim(), email: email.trim().toLowerCase(), password });
export const getCurrentUser = () => request<User>('/sesion');
export async function logout() { await request<void>('/logout', { method: 'POST' }); await clearSession(); }
export const verifyEmailCode = (code: string) => request<User>('/verificacion-email/confirmar', { method: 'POST', body: JSON.stringify({ codigo: code }) });
export const resendEmailCode = () => request<{ expiresAt: string }>('/verificacion-email/enviar', { method: 'POST' });
export const requestPasswordRecovery = (email: string) => request<{ message: string }>('/recuperacion-password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) }, false);
export const resetPassword = (token: string, password: string) => request<void>('/restablecer-password', { method: 'POST', body: JSON.stringify({ token, password }) }, false);
export const updateUsername = (username: string) => request<User>('/cuenta/username', { method: 'PUT', body: JSON.stringify({ username: username.trim() }) });
export const updateProfilePicture = (profilePicture: string | null) => request<User>('/cuenta/foto', { method: 'PUT', body: JSON.stringify({ profilePicture }) });
export const changePassword = (currentPassword: string, password: string) => request<void>('/cuenta/password', { method: 'PUT', body: JSON.stringify({ currentPassword, password }) });
export const deleteOwnAccount = () => request<void>('/cuenta', { method: 'DELETE' });
export const getAdminUsers = (query = '') => request<AdminUser[]>(`/admin/usuarios?q=${encodeURIComponent(query.trim())}`);
export const updateAdminUser = (id: number, changes: { username?: string; profilePicture?: string | null }) => request<AdminUser>(`/admin/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteAdminUser = (id: number) => request<void>(`/admin/usuarios/${id}`, { method: 'DELETE' });
