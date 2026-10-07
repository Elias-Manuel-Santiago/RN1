import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import pool from '../modules/db.js';
import { actualizarPasswordConActual, login } from '../modules/consultas.js';
import { restablecerPasswordConToken } from '../modules/recuperacionPassword.js';
import { createApp } from '../app.js';

const currentToken = 'a'.repeat(64);
const recoveryToken = 'c'.repeat(64);
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
const oldPassword = 'Anterior123';
const newPassword = 'Nueva456! con espacios';

// Simula el almacenamiento y las transacciones, sin tocar cuentas ni bases reales.
// Las funciones de persistencia, el login y bcrypt son los del servidor.
async function database(t, faults = {}) {
  let state = {
    user: {
      id: 1,
      username: 'ana',
      email: 'ana@example.com',
      email_verified_at: '2026-01-01',
      password_hash: await bcrypt.hash(oldPassword, 4),
    },
    token: {
      id: 7,
      usuario_id: 1,
      token_hash: hashToken(recoveryToken),
      used: false,
      expired: false,
    },
    sessions: [currentToken, 'b'.repeat(64)].map((token) => ({
      token_hash: hashToken(token),
      revoked: false,
    })),
  };
  const stats = { commits: 0, rollbacks: 0, releases: 0 };
  t.mock.method(pool, 'query', async (sql, values) => {
    assert.match(
      sql,
      /SELECT .* FROM usuarios WHERE username = \? OR email = \?/,
    );
    return [
      [
        state.user &&
        [state.user.username, state.user.email].includes(values[0])
          ? { ...state.user }
          : null,
      ].filter(Boolean),
    ];
  });
  t.mock.method(pool, 'getConnection', async () => {
    let draft;
    return {
      beginTransaction: async () => {
        draft = structuredClone(state);
      },
      commit: async () => {
        if (faults.commit) throw new Error('commit failed');
        state = draft;
        stats.commits++;
      },
      rollback: async () => {
        stats.rollbacks++;
      },
      release: () => {
        stats.releases++;
      },
      query: async (sql, values) => {
        const query = sql.replace(/\s+/g, ' ').trim();
        if (query.startsWith('SELECT password_hash')) {
          assert.match(query, /FOR UPDATE$/);
          return [
            [
              draft.user?.id === values[0]
                ? { password_hash: draft.user.password_hash }
                : null,
            ].filter(Boolean),
          ];
        }
        if (query.startsWith('SELECT id, usuario_id')) {
          assert.match(query, /FOR UPDATE$/);
          return [
            [
              draft.token.token_hash === values[0] &&
              !draft.token.used &&
              !draft.token.expired
                ? draft.token
                : null,
            ].filter(Boolean),
          ];
        }
        if (query.startsWith('UPDATE tokens_autenticacion')) {
          if (draft.token.used) return [{ affectedRows: 0 }];
          draft.token.used = true;
          return [{ affectedRows: 1 }];
        }
        if (query.startsWith('UPDATE usuarios')) {
          if (faults.update) throw new Error('update failed');
          if (faults.noRows || draft.user?.id !== values[1])
            return [{ affectedRows: 0 }];
          draft.user.password_hash = values[0];
          return [{ affectedRows: 1 }];
        }
        if (query.startsWith('UPDATE sesiones_usuario')) {
          if (faults.revoke) throw new Error('revocation failed');
          for (const session of draft.sessions) {
            if (session.token_hash !== values[1]) session.revoked = true;
          }
          return [{ affectedRows: 1 }];
        }
        throw new Error(`Unexpected SQL: ${query}`);
      },
    };
  });
  return { state: () => state, stats, faults };
}

async function assertLoginChanged() {
  assert.equal((await login('ana', oldPassword)).success, false);
  assert.equal((await login('ana', newPassword)).success, true);
}

async function withPasswordApi(db, work) {
  const app = createApp({
    login,
    actualizarPasswordConActual,
    restablecerPasswordConToken,
    obtenerUsuarioPorSesion: async (token) =>
      db
        .state()
        .sessions.some(
          (session) =>
            token &&
            session.token_hash === hashToken(token) &&
            !session.revoked,
        )
        ? { ...db.state().user }
        : null,
    crearSesion: async () => 'd'.repeat(64),
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = (route, body, bearer = false) =>
    fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
      method: route === '/cuenta/password' ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': 'native',
        ...(bearer ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    await work(request);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
}

for (const route of ['/cuenta/password', '/restablecer-password']) {
  test(`${route}: native HTTP change followed by login rejects the old password and accepts the new one`, async (t) => {
    const db = await database(t);
    await withPasswordApi(db, async (request) => {
      const body =
        route === '/cuenta/password'
          ? { currentPassword: oldPassword, password: newPassword }
          : { token: recoveryToken, password: newPassword };
      const response = await request(route, body, route === '/cuenta/password');
      assert.equal(response.status, 204);
      assert.equal(
        (await request('/login', { identifier: 'ana', password: oldPassword }))
          .status,
        401,
      );
      const accepted = await request('/login', {
        identifier: 'ana',
        password: newPassword,
      });
      assert.equal(accepted.status, 200);
      const data = await accepted.json();
      assert.equal(data.success, true);
      assert.equal(data.usuario.password_hash, undefined);
      assert.match(data.sessionToken, /^[a-f0-9]{64}$/);
    });
  });
}

test('account change persists the new password for login and preserves only the current session', async (t) => {
  const db = await database(t);
  assert.equal(
    await actualizarPasswordConActual(
      1,
      oldPassword,
      newPassword,
      currentToken,
    ),
    true,
  );
  await assertLoginChanged();
  assert.deepEqual(
    db.state().sessions.map((session) => session.revoked),
    [false, true],
  );
  assert.deepEqual(db.stats, { commits: 1, rollbacks: 0, releases: 1 });
  assert.equal(
    await actualizarPasswordConActual(1, oldPassword, 'Otra7890', currentToken),
    false,
  );
  await assertLoginChanged();
});

test('recovery persists the new password, revokes every session and rejects reuse', async (t) => {
  const db = await database(t);
  assert.deepEqual(
    await restablecerPasswordConToken(recoveryToken, newPassword),
    { success: true },
  );
  await assertLoginChanged();
  assert.equal(db.state().token.used, true);
  assert.ok(db.state().sessions.every((session) => session.revoked));
  assert.equal(
    (await restablecerPasswordConToken(recoveryToken, 'Otra7890')).success,
    false,
  );
  await assertLoginChanged();
});

for (const fault of ['update', 'noRows', 'revoke', 'commit']) {
  test(`recovery rolls back ${fault} failure and the same link can be retried`, async (t) => {
    const db = await database(t, { [fault]: true });
    await assert.rejects(
      restablecerPasswordConToken(recoveryToken, newPassword),
    );
    assert.equal((await login('ana', oldPassword)).success, true);
    assert.equal((await login('ana', newPassword)).success, false);
    assert.equal(db.state().token.used, false);
    assert.ok(db.state().sessions.every((session) => !session.revoked));
    assert.deepEqual(db.stats, { commits: 0, rollbacks: 1, releases: 1 });
    db.faults[fault] = false;
    assert.equal(
      (await restablecerPasswordConToken(recoveryToken, newPassword)).success,
      true,
    );
    await assertLoginChanged();
  });

  test(`account change does not report success or persist partial writes on ${fault} failure`, async (t) => {
    const db = await database(t, { [fault]: true });
    await assert.rejects(
      actualizarPasswordConActual(1, oldPassword, newPassword, currentToken),
    );
    assert.equal((await login('ana', oldPassword)).success, true);
    assert.equal((await login('ana', newPassword)).success, false);
    assert.ok(db.state().sessions.every((session) => !session.revoked));
    assert.deepEqual(db.stats, { commits: 0, rollbacks: 1, releases: 1 });
  });
}

test('incorrect current password and missing user never update credentials', async (t) => {
  const db = await database(t);
  assert.equal(
    await actualizarPasswordConActual(
      1,
      'incorrecta',
      newPassword,
      currentToken,
    ),
    false,
  );
  assert.equal(
    await actualizarPasswordConActual(
      99,
      oldPassword,
      newPassword,
      currentToken,
    ),
    false,
  );
  assert.equal((await login('ana', oldPassword)).success, true);
  assert.ok(db.state().sessions.every((session) => !session.revoked));
});

test('invalid, unknown and expired recovery tokens never change the password', async (t) => {
  const db = await database(t);
  for (const token of ['invalid', 'd'.repeat(64)]) {
    assert.equal(
      (await restablecerPasswordConToken(token, newPassword)).success,
      false,
    );
  }
  db.state().token.expired = true;
  assert.equal(
    (await restablecerPasswordConToken(recoveryToken, newPassword)).success,
    false,
  );
  assert.equal((await login('ana', oldPassword)).success, true);
  assert.equal(db.state().token.used, false);
});
