// Representa los datos públicos que devuelve la API. Nunca contiene contraseñas.
export type User = {
  id?: number
  username: string
  email: string
  email_verified_at: string | null
}
