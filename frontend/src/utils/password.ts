/** La contraseña requiere ocho caracteres como mínimo, una letra y un número. */
export function getPasswordError(password: string) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[a-záéíóúñ]/i.test(password)) return 'La contraseña debe incluir al menos una letra.'
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.'
  return ''
}

export function getUsernameError(username: string) {
  if (!/^[a-zA-Z0-9_]{3,100}$/.test(username.trim())) {
    return 'El usuario debe tener entre 3 y 100 caracteres: letras, números o guion bajo.'
  }
  return ''
}

export function getEmailError(email: string) {
  const normalizedEmail = email.trim()
  if (normalizedEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Ingresa un email válido.'
  }
  return ''
}
