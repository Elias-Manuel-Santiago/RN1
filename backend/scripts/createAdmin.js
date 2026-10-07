import {
  crearPersona,
  convertirEnAdmin,
  obtenerPersonaPorEmail,
} from '../modules/consultas.js';
import connection from '../modules/db.js';

try {
  const [, , username, emailArgument, password] = process.argv;
  const email = emailArgument?.trim().toLowerCase();

  if (!/^[a-zA-Z0-9_]{3,100}$/.test(username ?? '')) {
    throw new Error(
      'El username debe tener entre 3 y 100 caracteres: letras, números o guion bajo.',
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) {
    throw new Error('Indica un email válido.');
  }
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    !/[a-záéíóúñ]/i.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      'La contraseña debe tener 8 caracteres como mínimo, letras y números.',
    );
  }

  const existente = await obtenerPersonaPorEmail(email);
  if (existente) {
    throw new Error(
      'Ya existe una cuenta con ese email. Promuévela manualmente en la base de datos para no cambiar su contraseña sin autorización.',
    );
  }

  const resultado = await crearPersona({ username, email, password });
  if (typeof resultado !== 'number') {
    throw new Error(resultado.message ?? 'No se pudo crear el administrador.');
  }
  if ((await convertirEnAdmin(email)) !== 1) {
    throw new Error(
      'La cuenta se creó pero no se pudo asignar el rol administrador.',
    );
  }
  console.log(`Administrador creado: ${email}`);
} finally {
  await connection.end();
}
