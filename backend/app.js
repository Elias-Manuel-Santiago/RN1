import express from 'express';
import {
  obtenerTokenSesion,
  esClienteNativo,
} from './modules/sessionTransport.js';

export function createApp(services) {
  const {
    obtenerPersonasParaAdmin,
    obtenerPersonaPorId,
    obtenerPersonaPorEmail,
    obtenerPersonaPorUsername,
    login,
    crearPersona,
    actualizarUsername,
    actualizarPasswordConActual,
    actualizarFotoPerfil,
    eliminarPersona,
    crearSesion,
    NOMBRE_COOKIE_SESION,
    obtenerUsuarioPorSesion,
    opcionesCookieSesion,
    revocarSesion,
    enviarCodigoVerificacion,
    enviarEnlaceRecuperacion,
    crearCodigoVerificacion,
    verificarCodigoVerificacion,
    crearEnlaceRecuperacion,
    restablecerPasswordConToken,
  } = services;
  const app = express();

  app.use((req, res, next) => {
    const origin = req.get('origin');
    const frontendOrigins = (
      process.env.FRONTEND_URL ?? 'http://localhost:8081'
    )
      .split(',')
      .map((value) => value.trim());
    // Vite puede elegir 5174, 5175, etc. si el puerto por defecto está ocupado.
    // Solo se permiten esos orígenes locales durante desarrollo; producción exige
    // el origen exacto definido en FRONTEND_URL.
    const esOrigenLocalDeDesarrollo =
      process.env.NODE_ENV !== 'production' &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');

    if (
      origin &&
      !frontendOrigins.includes(origin) &&
      !esOrigenLocalDeDesarrollo
    ) {
      return res.status(403).json({ error: 'Origen no permitido' });
    }

    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Platform',
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
  app.use(express.json({ limit: '3mb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  function validarCampos(...campos) {
    return (req, res, next) => {
      const faltantes = campos.filter(
        (campo) =>
          typeof req.body?.[campo] !== 'string' ||
          req.body[campo].trim() === '',
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
    // bcrypt solo compara los primeros 72 bytes; evita cambios que ignoren el sufijo.
    if (
      typeof password === 'string' &&
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error:
          'La contraseña no debe superar 72 bytes; los acentos y emojis ocupan más de un byte',
      });
    }
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
    const username =
      typeof req.body?.username === 'string' ? req.body.username.trim() : '';
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
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
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
    // El id es un dato interno: únicamente se incluye en las respuestas del panel admin.
    const { id, password, password_hash, is_admin, ...datos } = usuario;
    return { ...datos, role: is_admin ? 'admin' : 'user' };
  }

  function usuarioAdmin(usuario) {
    return { id: usuario.id, ...usuarioPublico(usuario) };
  }

  // Resuelve la cookie en cada ruta protegida y deja el usuario disponible en req.usuario.
  async function requerirSesion(req, res, next) {
    const token = obtenerTokenSesion(req);
    const usuario = await obtenerUsuarioPorSesion(token);
    if (!usuario)
      return res.status(401).json({ error: 'Debes iniciar sesión' });

    req.usuario = usuario;
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

  function requerirAdmin(req, res, next) {
    if (!req.usuario.is_admin) {
      return res
        .status(403)
        .json({ error: 'Necesitas permisos de administrador' });
    }
    next();
  }

  function errorFotoPerfil(foto) {
    if (foto === null) return null;
    const coincide =
      typeof foto === 'string' &&
      /^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/]+={0,2}$/.test(
        foto,
      );
    // 2 MB ya codificados en base64 (aprox. 1.5 MB del archivo original).
    if (!coincide || foto.length > 2 * 1024 * 1024) {
      return 'La foto debe ser una imagen PNG, JPG, WEBP o GIF de hasta 1.5 MB';
    }
    return null;
  }

  function validarFotoPerfil(req, res, next) {
    const error = errorFotoPerfil(req.body?.profilePicture);
    if (error) return res.status(400).json({ error });
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
      return res
        .status(400)
        .json({ error: 'El id debe ser un entero positivo' });
    }
    next();
  });

  app.get('/api/sesion', requerirSesion, (req, res) => {
    res.json(usuarioPublico(req.usuario));
  });

  app.post('/api/logout', async (req, res) => {
    const token = obtenerTokenSesion(req);
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

  app.post(
    '/api/verificacion-email/enviar',
    requerirSesion,
    async (req, res) => {
      if (req.usuario.email_verified_at) {
        return res.status(400).json({ error: 'El correo ya está verificado' });
      }

      const expiresAt = await enviarNuevoCodigo(req.usuario);
      res.json({ expiresAt });
    },
  );

  app.post(
    '/api/verificacion-email/confirmar',
    requerirSesion,
    validarCampos('codigo'),
    async (req, res) => {
      if (!/^\d{6}$/.test(req.body.codigo)) {
        return res
          .status(400)
          .json({ error: 'El código debe tener 6 dígitos' });
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
      const verificationExpiresAt = resultado.usuario.email_verified_at
        ? null
        : await enviarNuevoCodigo(resultado.usuario);
      if (!esClienteNativo(req))
        res.cookie(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
      res.header('Cache-Control', 'no-store');
      res.json({
        success: true,
        usuario: usuarioPublico(resultado.usuario),
        verificationExpiresAt,
        ...(esClienteNativo(req) ? { sessionToken: token } : {}),
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
      const usuario = {
        id: resultado,
        username,
        email,
        email_verified_at: null,
        profile_picture: null,
        is_admin: 0,
      };
      const token = await crearSesion(usuario.id, {
        userAgent: req.get('user-agent'),
        ipAddress: req.ip,
      });
      const verificationExpiresAt = await enviarNuevoCodigo(usuario);
      if (!esClienteNativo(req))
        res.cookie(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
      res.header('Cache-Control', 'no-store');
      res.status(201).json({
        usuario: usuarioPublico(usuario),
        verificationExpiresAt,
        ...(esClienteNativo(req) ? { sessionToken: token } : {}),
      });
    },
  );

  app.put(
    '/api/cuenta/username',
    requerirSesion,
    requerirEmailVerificado,
    validarCampos('username'),
    validarUsername,
    async (req, res) => {
      const id = req.usuario.id;
      const { username } = req.body;
      const usuario = await obtenerPersonaPorId(id);
      if (!usuario)
        return res.status(404).json({ error: 'Usuario no encontrado' });
      const existente = await obtenerPersonaPorUsername(username);
      if (existente && existente.id !== id) {
        return res.status(409).json({ error: 'Username ya en uso' });
      }
      await actualizarUsername(id, { username });
      res.json(usuarioPublico({ ...usuario, username }));
    },
  );

  app.put(
    '/api/cuenta/password',
    requerirSesion,
    requerirEmailVerificado,
    validarCampos('currentPassword', 'password'),
    validarPasswordSegura,
    async (req, res) => {
      if (req.body.currentPassword === req.body.password) {
        return res.status(400).json({
          error: 'La nueva contraseña debe ser distinta de la actual',
        });
      }
      const token = obtenerTokenSesion(req);
      const actualizada = await actualizarPasswordConActual(
        req.usuario.id,
        req.body.currentPassword,
        req.body.password,
        token,
      );
      if (!actualizada)
        return res
          .status(400)
          .json({ error: 'La contraseña actual no es correcta' });

      res.sendStatus(204);
    },
  );

  app.put(
    '/api/cuenta/foto',
    requerirSesion,
    requerirEmailVerificado,
    validarFotoPerfil,
    async (req, res) => {
      await actualizarFotoPerfil(req.usuario.id, req.body.profilePicture);
      res.json(
        usuarioPublico({
          ...req.usuario,
          profile_picture: req.body.profilePicture,
        }),
      );
    },
  );

  // La cuenta local se elimina por su propia sesión; las identidades de Auth0 se gestionan aparte.
  app.delete('/api/cuenta', requerirSesion, async (req, res) => {
    const filasAfectadas = await eliminarPersona(req.usuario.id);
    if (filasAfectadas === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.clearCookie(NOMBRE_COOKIE_SESION, opcionesCookieSesion());
    res.sendStatus(204);
  });

  app.get(
    '/api/admin/usuarios',
    requerirSesion,
    requerirEmailVerificado,
    requerirAdmin,
    async (req, res) => {
      const busqueda =
        typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (busqueda.length > 100)
        return res
          .status(400)
          .json({ error: 'La búsqueda no puede superar 100 caracteres' });
      const usuarios = await obtenerPersonasParaAdmin(busqueda);
      res.json(usuarios.map(usuarioAdmin));
    },
  );

  app.patch(
    '/api/admin/usuarios/:id',
    requerirSesion,
    requerirEmailVerificado,
    requerirAdmin,
    async (req, res) => {
      const { id } = req.params;
      const tieneUsername = Object.hasOwn(req.body ?? {}, 'username');
      const tieneFoto = Object.hasOwn(req.body ?? {}, 'profilePicture');
      if (!tieneUsername && !tieneFoto)
        return res
          .status(400)
          .json({ error: 'Indica un nombre de usuario o una foto' });

      // Validate the entire draft before writing either field.
      const usuarioActual = await obtenerPersonaPorId(id);
      if (!usuarioActual)
        return res.status(404).json({ error: 'Usuario no encontrado' });
      if (tieneFoto) {
        const errorFoto = errorFotoPerfil(req.body.profilePicture);
        if (errorFoto) return res.status(400).json({ error: errorFoto });
      }

      if (tieneUsername) {
        const username =
          typeof req.body?.username === 'string'
            ? req.body.username.trim()
            : '';
        if (!/^[a-zA-Z0-9_]{3,100}$/.test(username ?? '')) {
          return res.status(400).json({
            error:
              'El usuario debe tener entre 3 y 100 caracteres: letras, números o guion bajo',
          });
        }
        req.body.username = username;
        const existente = await obtenerPersonaPorUsername(req.body.username);
        if (existente && String(existente.id) !== id)
          return res.status(409).json({ error: 'Username ya en uso' });
        await actualizarUsername(id, { username: req.body.username });
      }
      if (tieneFoto) {
        const errorFoto = errorFotoPerfil(req.body.profilePicture);
        if (errorFoto) return res.status(400).json({ error: errorFoto });
        await actualizarFotoPerfil(id, req.body.profilePicture);
      }

      const usuario = await obtenerPersonaPorId(id);
      if (!usuario)
        return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(usuarioAdmin(usuario));
    },
  );

  app.delete(
    '/api/admin/usuarios/:id',
    requerirSesion,
    requerirEmailVerificado,
    requerirAdmin,
    async (req, res) => {
      if (Number(req.params.id) === req.usuario.id) {
        return res.status(400).json({
          error:
            'No puedes eliminar tu propia cuenta desde el panel administrador',
        });
      }
      const filasAfectadas = await eliminarPersona(req.params.id);
      if (filasAfectadas === 0)
        return res.status(404).json({ error: 'Usuario no encontrado' });
      res.sendStatus(204);
    },
  );

  app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
      return res
        .status(413)
        .json({ error: 'La imagen supera el tamaño permitido' });
    }
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

  return app;
}
