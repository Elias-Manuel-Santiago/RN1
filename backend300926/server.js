import express from 'express';
import {
  obtenerPersonas,
  obtenerPersonaPorId,
  obtenerPersonaPorEmail,
  obtenerPersonaPorUsername,
  login,
  crearPersona,
  actualizarUsername,
  actualizarPassword,
  eliminarPersona,
} from './modules/consultas.js';
import {
  crearSesion,
  leerCookie,
  NOMBRE_COOKIE_SESION,
  obtenerUsuarioPorSesion,
  opcionesCookieSesion,
  revocarSesion,
} from './modules/sesiones.js';
import {
  enviarCodigoVerificacion,
  enviarEnlaceRecuperacion,
} from './modules/correo.js';
import {
  crearCodigoVerificacion,
  verificarCodigoVerificacion,
} from './modules/verificacionEmail.js';
import {
  crearEnlaceRecuperacion,
  restablecerPasswordConToken,
} from './modules/recuperacionPassword.js';

const app = express();
const port = 3005;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

function validarCampos(...campos) {
  return (req, res, next) => {
    const faltantes = campos.filter(
      (campo) =>
        typeof req.body?.[campo] !== 'string' || req.body[campo].trim() === '',
    );
    if (faltantes.length) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios o no son textos válidos',
        campos: faltantes,
      });
    }
    next();
  };
}

// También se valida en el servidor: no puede evitarse modificando el formulario.
function validarPasswordSegura(req, res, next) {
  const password = req.body?.password;
  const esValida =
    typeof password === 'string' &&
    password.length >= 8 &&
    /[a-záéíóúñ]/i.test(password) &&
    /\d/.test(password);

  if (!esValida) {
    return res.status(400).json({
      error:
        'La contraseña debe tener 8 caracteres como mínimo, letras y números',
    });
  }
  next();
}

function validarUsername(req, res, next) {
  const username = req.body?.username?.trim();
  if (!/^[a-zA-Z0-9_]{3,100}$/.test(username ?? '')) {
    return res.status(400).json({
      error:
        'El usuario debe tener entre 3 y 100 caracteres: letras, números o guion bajo',
    });
  }
  req.body.username = username;
  next();
}

function validarEmail(req, res, next) {
  const email = req.body?.email?.trim().toLowerCase();
  const esValido =
    typeof email === 'string' &&
    email.length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!esValido) {
    return res
      .status(400)
      .json({ error: 'El email no tiene un formato válido' });
  }
  req.body.email = email;
  next();
}

function usuarioPublico(usuario) {
  const { password, password_hash, ...datos } = usuario;
  return datos;
}

// Resuelve la cookie en cada ruta protegida y deja el usuario disponible en req.usuario.
async function requerirSesion(req, res, next) {
  const token = leerCookie(req.headers.cookie, NOMBRE_COOKIE_SESION);
  const usuario = await obtenerUsuarioPorSesion(token);
  if (!usuario) return res.status(401).json({ error: 'Debes iniciar sesión' });

  req.usuario = usuario;
  next();
}

function requerirMismoUsuario(req, res, next) {
  if (Number(req.params.id) !== req.usuario.id) {
    return res
      .status(403)
      .json({ error: 'No tienes permiso para modificar este usuario' });
  }
  next();
}

function requerirEmailVerificado(req, res, next) {
  if (!req.usuario.email_verified_at) {
    return res
      .status(403)
      .json({ error: 'Debes verificar tu correo para acceder' });
  }
  next();
}

async function enviarNuevoCodigo(usuario) {
  const { codigo, expiresAt } = await crearCodigoVerificacion(usuario.id);
  await enviarCodigoVerificacion({
    email: usuario.email,
    username: usuario.username,
    codigo,
  });
  return expiresAt;
}

app.param('id', (req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  }
  next();
});

app.get('/api/sesion', requerirSesion, (req, res) => {
  res.json(usuarioPublico(req.usuario));
});

app.post('/api/logout', async (req, res) => {
  const token = leerCookie(req.headers.cookie, NOMBRE_COOKIE_SESION);
  await revocarSesion(token);
  res.clearCookie(NOMBRE_COOKIE_SESION, opcionesCookieSesion());
  res.sendStatus(204);
});

app.post(
  '/api/recuperacion-password',
  validarCampos('email'),
  validarEmail,
  async (req, res) => {
    const usuario = await obtenerPersonaPorEmail(req.body.email);

    // La misma respuesta evita revelar si un email está registrado o no.
    if (usuario) {
      const enlace = await crearEnlaceRecuperacion(usuario.id);
      await enviarEnlaceRecuperacion({
        email: usuario.email,
        username: usuario.username,
        enlace,
      });
    }

    res.json({
      message:
        'Si el correo está registrado, recibirás un enlace de recuperación.',
    });
  },
);

app.post(
  '/api/restablecer-password',
  validarCampos('token', 'password'),
  validarPasswordSegura,
  async (req, res) => {
    const resultado = await restablecerPasswordConToken(
      req.body.token,
      req.body.password,
    );
    if (!resultado.success) return res.status(400).json(resultado);

    res.sendStatus(204);
  },
);

app.post('/api/verificacion-email/enviar', requerirSesion, async (req, res) => {
  if (req.usuario.email_verified_at) {
    return res.status(400).json({ error: 'El correo ya está verificado' });
  }

  const expiresAt = await enviarNuevoCodigo(req.usuario);
  res.json({ expiresAt });
});

app.post(
  '/api/verificacion-email/confirmar',
  requerirSesion,
  validarCampos('codigo'),
  async (req, res) => {
    if (!/^\d{6}$/.test(req.body.codigo)) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    }

    const resultado = await verificarCodigoVerificacion(
      req.usuario.id,
      req.body.codigo,
    );
    if (!resultado.success) return res.status(400).json(resultado);

    res.json({
      ...usuarioPublico(req.usuario),
      email_verified_at: new Date().toISOString(),
    });
  },
);

app.get(
  '/api/personas',
  requerirSesion,
  requerirEmailVerificado,
  async (req, res) => {
    const usuarios = await obtenerPersonas();
    res.json(usuarios.map(usuarioPublico));
  },
);

app.get(
  '/api/personas/:id',
  requerirSesion,
  requerirEmailVerificado,
  requerirMismoUsuario,
  (req, res) => {
    res.json(usuarioPublico(req.usuario));
  },
);

app.post(
  '/api/login',
  validarCampos('identifier', 'password'),
  async (req, res) => {
    const resultado = await login(req.body.identifier, req.body.password);
    if (!resultado.success) return res.status(401).json(resultado);

    const token = await crearSesion(resultado.usuario.id, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    res.cookie(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
    const verificationExpiresAt = resultado.usuario.email_verified_at
      ? null
      : await enviarNuevoCodigo(resultado.usuario);
    res.json({
      success: true,
      usuario: resultado.usuario,
      verificationExpiresAt,
    });
  },
);

app.post(
  '/api/personas',
  validarCampos('username', 'email', 'password'),
  validarUsername,
  validarEmail,
  validarPasswordSegura,
  async (req, res) => {
    const { username, email, password } = req.body;
    const resultado = await crearPersona({ username, email, password });
    if (resultado?.success === false) return res.status(409).json(resultado);
    const usuario = { id: resultado, username, email, email_verified_at: null };
    const token = await crearSesion(usuario.id, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    res.cookie(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
    const verificationExpiresAt = await enviarNuevoCodigo(usuario);
    res.status(201).json({ usuario, verificationExpiresAt });
  },
);

app.put(
  '/api/personas/:id/username',
  requerirSesion,
  requerirEmailVerificado,
  requerirMismoUsuario,
  validarCampos('username'),
  validarUsername,
  async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    const usuario = await obtenerPersonaPorId(id);
    if (!usuario)
      return res.status(404).json({ error: 'Usuario no encontrado' });
    const existente = await obtenerPersonaPorUsername(username);
    if (existente && String(existente.id) !== id) {
      return res.status(409).json({ error: 'Username ya en uso' });
    }
    await actualizarUsername(id, { username });
    res.json({ id: Number(id), username });
  },
);

app.put(
  '/api/personas/:id/password',
  requerirSesion,
  requerirEmailVerificado,
  requerirMismoUsuario,
  validarCampos('password'),
  validarPasswordSegura,
  async (req, res) => {
    const { id } = req.params;
    const usuario = await obtenerPersonaPorId(id);
    if (!usuario)
      return res.status(404).json({ error: 'Usuario no encontrado' });
    await actualizarPassword(id, { password: req.body.password });
    res.sendStatus(204);
  },
);

app.delete(
  '/api/personas/:id',
  requerirSesion,
  requerirEmailVerificado,
  requerirMismoUsuario,
  async (req, res) => {
    const filasAfectadas = await eliminarPersona(req.params.id);
    if (filasAfectadas === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });
    res.sendStatus(204);
  },
);

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ error: 'El cuerpo debe contener JSON válido' });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return res
      .status(409)
      .json({ error: 'El username o email ya está en uso' });
  }
  console.error('Error en la API:', error.message);
  res.status(500).json({ error: 'Error en servidor' });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
