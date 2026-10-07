import type { User } from '../types/user.ts'

const API_URL = 'http://localhost:3005/api'

// Respuesta común tras crear una cuenta o iniciar sesión.
export type AuthenticatedResponse = {
  usuario: User
  verificationExpiresAt: string | null
}

// Centraliza las peticiones y convierte los errores de la API en mensajes simples.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message ?? data.error ?? 'Ocurrió un error en la petición.')
  }

  return data as T
}

export async function register(username: string, email: string, password: string) {
  return request<AuthenticatedResponse>('/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
}

export async function login(identifier: string, password: string) {
  return request<{ success: true } & AuthenticatedResponse>('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
}

// Se usa al abrir la aplicación para restaurar una sesión persistente.
export function getCurrentUser() {
  return request<User>('/sesion')
}

export function logout() {
  return request<void>('/logout', { method: 'POST' })
}

// Confirma el código de seis dígitos de la sesión actual.
export function verifyEmailCode(code: string) {
  return request<User>('/verificacion-email/confirmar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo: code }),
  })
}

// Invalida el código anterior y solicita uno nuevo.
export function resendEmailCode() {
  return request<{ expiresAt: string }>('/verificacion-email/enviar', {
    method: 'POST',
  })
}

export function requestPasswordRecovery(email: string) {
  return request<{ message: string }>('/recuperacion-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string) {
  return request<void>('/restablecer-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
}
