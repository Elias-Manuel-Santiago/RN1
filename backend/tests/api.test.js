import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.js';
import { NOMBRE_COOKIE_SESION } from '../modules/sesionesCookie.js';

const token = 'a'.repeat(64);
const verified = {
  id: 1,
  username: 'ana',
  email: 'ana@example.com',
  email_verified_at: '2026-01-01',
  profile_picture: null,
  is_admin: 0,
  password_hash: 'never-expose-this',
};
function services(overrides = {}) {
  return {
    NOMBRE_COOKIE_SESION,
    opcionesCookieSesion: () => ({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    }),
    obtenerUsuarioPorSesion: async (value) =>
      value === token ? { ...verified } : null,
    login: async () => ({ success: true, usuario: { ...verified } }),
    crearSesion: async () => token,
    crearPersona: async () => 2,
    crearCodigoVerificacion: async () => ({
      codigo: '123456',
      expiresAt: '2026-01-01',
    }),
    enviarCodigoVerificacion: async () => {},
    revocarSesion: async () => {},
    obtenerPersonaPorEmail: async () => null,
    enviarEnlaceRecuperacion: async () => {},
    obtenerPersonaPorId: async () => ({ ...verified }),
    obtenerPersonaPorUsername: async () => null,
    actualizarUsername: async () => {},
    actualizarFotoPerfil: async () => {},
    actualizarPasswordConActual: async () => true,
    eliminarPersona: async () => 1,
    obtenerPersonasParaAdmin: async () => [{ ...verified }],
    verificarCodigoVerificacion: async () => ({ success: true }),
    restablecerPasswordConToken: async () => ({ success: true }),
    ...overrides,
  };
}
async function withApi(overrides, callback) {
  const server = createApp(services(overrides)).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, options = {}) => fetch(`${url}${path}`, options);
  try {
    await callback(request);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
}
const json = (body, headers = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});
const bearer = { Authorization: `Bearer ${token}` };

test('native login returns an opaque token and no cookie or internal profile fields', async () => {
  await withApi({}, async (request) => {
    const response = await request(
      '/login',
      json(
        { identifier: 'ana', password: 'password1' },
        { 'X-Client-Platform': 'native' },
      ),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json();
    assert.equal(data.sessionToken, token);
    assert.equal(data.usuario.role, 'user');
    assert.equal(data.usuario.id, undefined);
    assert.equal(data.usuario.password_hash, undefined);
    assert.equal(data.usuario.is_admin, undefined);
  });
});
test('web login retains HttpOnly cookie sessions and does not expose the token', async () => {
  await withApi({}, async (request) => {
    const response = await request(
      '/login',
      json({ identifier: 'ana', password: 'password1' }),
    );
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await response.json()).sessionToken, undefined);
    const session = await request('/sesion', {
      headers: { Cookie: `sesion_id=${token}` },
    });
    assert.equal(session.status, 200);
  });
});
test('native registration sends verification and returns a public, unverified user', async () => {
  let sent = false;
  await withApi(
    {
      enviarCodigoVerificacion: async () => {
        sent = true;
      },
    },
    async (request) => {
      const response = await request(
        '/personas',
        json(
          { username: 'ana', email: 'ANA@example.com', password: 'password1' },
          { 'X-Client-Platform': 'native' },
        ),
      );
      assert.equal(response.status, 201);
      const data = await response.json();
      assert.equal(data.sessionToken, token);
      assert.equal(data.usuario.email, 'ana@example.com');
      assert.equal(data.usuario.email_verified_at, null);
      assert.equal(data.usuario.role, 'user');
      assert.equal(sent, true);
    },
  );
});
test('bearer sessions restore users and malformed Authorization cannot fall back to a cookie', async () => {
  await withApi({}, async (request) => {
    assert.equal((await request('/sesion', { headers: bearer })).status, 200);
    assert.equal((await request('/sesion')).status, 401);
    assert.equal(
      (
        await request('/sesion', {
          headers: {
            Authorization: 'Bearer bad',
            Cookie: `sesion_id=${token}`,
          },
        })
      ).status,
      401,
    );
  });
});
test('logout revokes the same mobile bearer token', async () => {
  let revoked;
  await withApi(
    {
      revocarSesion: async (value) => {
        revoked = value;
      },
    },
    async (request) => {
      assert.equal(
        (await request('/logout', { method: 'POST', headers: bearer })).status,
        204,
      );
      assert.equal(revoked, token);
    },
  );
});
test('ordinary and unverified users cannot read the admin directory or change protected profiles', async () => {
  await withApi({}, async (request) =>
    assert.equal(
      (await request('/admin/usuarios', { headers: bearer })).status,
      403,
    ),
  );
  await withApi(
    {
      obtenerUsuarioPorSesion: async () => ({
        ...verified,
        email_verified_at: null,
      }),
    },
    async (request) => {
      assert.equal(
        (await request('/admin/usuarios', { headers: bearer })).status,
        403,
      );
      assert.equal(
        (
          await request('/cuenta/username', {
            ...json({ username: 'other' }, bearer),
            method: 'PUT',
          })
        ).status,
        403,
      );
      assert.equal((await request('/sesion', { headers: bearer })).status, 200);
    },
  );
});
test('admins get ids but no password hashes and cannot delete themselves from the directory', async () => {
  await withApi(
    { obtenerUsuarioPorSesion: async () => ({ ...verified, is_admin: 1 }) },
    async (request) => {
      const response = await request('/admin/usuarios', { headers: bearer });
      assert.equal(response.status, 200);
      const [user] = await response.json();
      assert.equal(user.id, 1);
      assert.equal(user.password_hash, undefined);
      assert.equal(
        (
          await request('/admin/usuarios/1', {
            method: 'DELETE',
            headers: bearer,
          })
        ).status,
        400,
      );
    },
  );
});
test('admin validation rejects the entire invalid draft before any profile writes', async () => {
  let writes = 0;
  await withApi(
    {
      obtenerUsuarioPorSesion: async () => ({ ...verified, is_admin: 1 }),
      actualizarUsername: async () => {
        writes++;
      },
    },
    async (request) => {
      assert.equal(
        (
          await request('/admin/usuarios/2', {
            ...json(
              { username: 'valid', profilePicture: 'not-an-image' },
              bearer,
            ),
            method: 'PATCH',
          })
        ).status,
        400,
      );
      assert.equal(writes, 0);
      assert.equal(
        (
          await request('/admin/usuarios/2', {
            ...json({ username: 42 }, bearer),
            method: 'PATCH',
          })
        ).status,
        400,
      );
    },
  );
});
test('profile photo accepts more than Express default 100 KB and rejects invalid images', async () => {
  let saved;
  const image = `data:image/jpeg;base64,${'A'.repeat(200000)}`;
  await withApi(
    {
      actualizarFotoPerfil: async (_id, picture) => {
        saved = picture;
      },
    },
    async (request) => {
      assert.equal(
        (
          await request('/cuenta/foto', {
            ...json({ profilePicture: image }, bearer),
            method: 'PUT',
          })
        ).status,
        200,
      );
      assert.equal(saved, image);
      assert.equal(
        (
          await request('/cuenta/foto', {
            ...json({ profilePicture: 'bad' }, bearer),
            method: 'PUT',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request('/cuenta/foto', {
            ...json({ profilePicture: null }, bearer),
            method: 'PUT',
          })
        ).status,
        200,
      );
    },
  );
});
test('password change checks current password and revokes other sessions using bearer token', async () => {
  let saved;
  await withApi(
    {
      actualizarPasswordConActual: async (...args) => {
        saved = args;
        return true;
      },
    },
    async (request) => {
      assert.equal(
        (
          await request('/cuenta/password', {
            ...json(
              { currentPassword: 'oldPassword1', password: 'newPassword1' },
              bearer,
            ),
            method: 'PUT',
          })
        ).status,
        204,
      );
      assert.deepEqual(saved, [
        verified.id,
        'oldPassword1',
        'newPassword1',
        token,
      ]);
    },
  );
  await withApi(
    { actualizarPasswordConActual: async () => false },
    async (request) => {
      assert.equal(
        (
          await request('/cuenta/password', {
            ...json(
              { currentPassword: 'wrong', password: 'newPassword1' },
              bearer,
            ),
            method: 'PUT',
          })
        ).status,
        400,
      );
    },
  );
});
test('recovery hides account existence and reset validates the password', async () => {
  await withApi({}, async (request) => {
    const response = await request(
      '/recuperacion-password',
      json({ email: 'missing@example.com' }),
    );
    assert.equal(response.status, 200);
    assert.match(
      (await response.json()).message,
      /Si el correo está registrado/,
    );
    assert.equal(
      (
        await request(
          '/restablecer-password',
          json({ token, password: 'short' }),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          '/restablecer-password',
          json({ token, password: 'newPassword1' }),
        )
      ).status,
      204,
    );
  });
});

test('password endpoints reject bcrypt truncation and unchanged passwords before persistence', async () => {
  let writes = 0;
  await withApi(
    {
      actualizarPasswordConActual: async () => {
        writes++;
        return true;
      },
      restablecerPasswordConToken: async () => {
        writes++;
        return { success: true };
      },
    },
    async (request) => {
      assert.equal(
        (
          await request('/cuenta/password', {
            ...json(
              { currentPassword: 'Anterior123', password: 'Anterior123' },
              bearer,
            ),
            method: 'PUT',
          })
        ).status,
        400,
      );
      for (const password of [
        'a1' + 'a'.repeat(71),
        'a1' + 'á'.repeat(36),
        'a1' + '😀'.repeat(18),
      ]) {
        assert.equal(
          (
            await request('/cuenta/password', {
              ...json({ currentPassword: 'Anterior123', password }, bearer),
              method: 'PUT',
            })
          ).status,
          400,
        );
        assert.equal(
          (await request('/restablecer-password', json({ token, password })))
            .status,
          400,
        );
      }
      assert.equal(writes, 0);
      assert.equal(
        (
          await request('/cuenta/password', {
            ...json(
              {
                currentPassword: 'Anterior123',
                password: 'a1' + 'á'.repeat(35),
              },
              bearer,
            ),
            method: 'PUT',
          })
        ).status,
        204,
      );
      assert.equal(writes, 1);
    },
  );
});

test('password persistence failures return an error instead of HTTP 204', async () => {
  const previousError = console.error;
  console.error = () => {};
  try {
    await withApi(
      {
        actualizarPasswordConActual: async () => {
          throw new Error('update failed');
        },
        restablecerPasswordConToken: async () => {
          throw new Error('update failed');
        },
      },
      async (request) => {
        assert.equal(
          (
            await request('/cuenta/password', {
              ...json(
                { currentPassword: 'Anterior123', password: 'Nueva456' },
                bearer,
              ),
              method: 'PUT',
            })
          ).status,
          500,
        );
        assert.equal(
          (
            await request(
              '/restablecer-password',
              json({ token, password: 'Nueva456' }),
            )
          ).status,
          500,
        );
      },
    );
  } finally {
    console.error = previousError;
  }
});
test('CORS allows local Expo preview and native authorization preflight', async () => {
  await withApi({}, async (request) => {
    const response = await request('/sesion', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:8081',
        'Access-Control-Request-Headers': 'authorization,x-client-platform',
      },
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      'http://localhost:8081',
    );
    assert.match(
      response.headers.get('access-control-allow-headers'),
      /Authorization/,
    );
    assert.equal(
      (
        await request('/health', {
          headers: { Origin: 'https://unknown.example' },
        })
      ).status,
      403,
    );
  });
});

test('production CORS allows configured web origins with credentials and rejects other origins', async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'https://app.example.com, http://localhost:8081';
  try {
    await withApi({}, async (request) => {
      for (const origin of [
        'https://app.example.com',
        'http://localhost:8081',
      ]) {
        const preflight = await request('/login', {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type',
          },
        });
        assert.equal(preflight.status, 200);
        assert.equal(
          preflight.headers.get('access-control-allow-origin'),
          origin,
        );
        assert.equal(
          preflight.headers.get('access-control-allow-credentials'),
          'true',
        );
        assert.match(
          preflight.headers.get('access-control-allow-headers'),
          /Content-Type/,
        );
        assert.match(preflight.headers.get('vary'), /Origin/);

        const response = await request(
          '/login',
          json(
            { identifier: 'ana', password: 'password1' },
            { Origin: origin },
          ),
        );
        assert.equal(response.status, 200);
        assert.equal(
          response.headers.get('access-control-allow-origin'),
          origin,
        );
        assert.equal(
          response.headers.get('access-control-allow-credentials'),
          'true',
        );
        assert.match(response.headers.get('set-cookie'), /HttpOnly/);

        const unauthorized = await request('/sesion', {
          headers: { Origin: origin },
        });
        assert.equal(unauthorized.status, 401);
        assert.equal(
          unauthorized.headers.get('access-control-allow-origin'),
          origin,
        );
      }
      for (const origin of [
        'https://unknown.example',
        'http://localhost:8082',
      ]) {
        const response = await request('/login', {
          method: 'OPTIONS',
          headers: { Origin: origin },
        });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('access-control-allow-origin'), null);
        assert.equal((await response.json()).error, 'Origen no permitido');
      }
    });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
