const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(file, dependencies = {}, globals = {}) {
  const filename = path.join(__dirname, '..', 'src', file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    compiled,
    {
      exports,
      require: (name) => {
        if (!(name in dependencies))
          throw new Error(`Unexpected dependency: ${name}`);
        return dependencies[name];
      },
      process: { env: {} },
      URL,
      Headers,
      AbortController,
      setTimeout,
      clearTimeout,
      __DEV__: true,
      ...globals,
    },
    { filename },
  );
  return exports;
}

function apiClient(fetch, platform = 'ios') {
  const calls = [];
  let token = 'a'.repeat(64);
  const api = loadSource(
    'services/apiAccess.ts',
    {
      'expo-constants': {
        default: { expoConfig: { hostUri: '192.0.2.1:8081' } },
      },
      'react-native': { Platform: { OS: platform } },
      './session-storage': {
        readSession: async () => token,
        saveSession: async (value) => {
          token = value;
        },
        clearSession: async () => {
          token = null;
        },
      },
    },
    {
      fetch: async (...args) => {
        calls.push(args);
        return fetch(...args);
      },
    },
  );
  return { api, calls, token: () => token };
}

for (const platform of ['ios', 'android', 'web']) {
  test(`${platform}: password change sends the exact passwords and waits for server confirmation`, async () => {
    const client = apiClient(
      async () => new Response(null, { status: 204 }),
      platform,
    );
    await client.api.changePassword(' Actual123 ', ' Nueva456 ');
    const [url, options] = client.calls[0];
    assert.match(url, /\/api\/cuenta\/password$/);
    assert.equal(options.method, 'PUT');
    assert.deepEqual(JSON.parse(options.body), {
      currentPassword: ' Actual123 ',
      password: ' Nueva456 ',
    });
    assert.equal(options.credentials, platform === 'web' ? 'include' : 'omit');
    assert.equal(
      options.headers.get('Authorization'),
      platform === 'web' ? null : `Bearer ${client.token()}`,
    );
    assert.equal(
      options.headers.get('X-Client-Platform'),
      platform === 'web' ? null : 'native',
    );
  });
}

test('recovery sends the link token without requiring a logged-in session', async () => {
  const client = apiClient(async () => new Response(null, { status: 204 }));
  await client.api.clearLocalSession();
  await client.api.resetPassword('c'.repeat(64), 'Nueva456');
  const [url, options] = client.calls[0];
  assert.match(url, /\/restablecer-password$/);
  assert.deepEqual(JSON.parse(options.body), {
    token: 'c'.repeat(64),
    password: 'Nueva456',
  });
  assert.equal(options.headers.get('Authorization'), null);
});

for (const operation of ['changePassword', 'resetPassword']) {
  test(`${operation}: an unexpected HTTP 200 cannot produce a success message`, async () => {
    const client = apiClient(async () =>
      Response.json({ success: false, message: 'No se guardó' }),
    );
    await assert.rejects(
      client.api[operation]('a'.repeat(64), 'Nueva456'),
      /No se guardó/,
    );
    const unconfirmed = apiClient(async () =>
      Response.json({ success: true, message: 'Actualizada' }),
    );
    await assert.rejects(
      unconfirmed.api[operation]('a'.repeat(64), 'Nueva456'),
      /no confirmó/,
    );
  });
  test(`${operation}: server errors and disconnected network reject the operation`, async () => {
    for (const fetch of [
      async () =>
        Response.json({ error: 'Error en servidor' }, { status: 500 }),
      async () => {
        throw new TypeError('Network failure');
      },
    ]) {
      const client = apiClient(fetch);
      await assert.rejects(client.api[operation]('a'.repeat(64), 'Nueva456'));
      assert.equal(client.token(), 'a'.repeat(64));
    }
  });
}

test('expired mobile session clears credentials and never reports a password change', async () => {
  const client = apiClient(async () =>
    Response.json({ error: 'Debes iniciar sesión' }, { status: 401 }),
  );
  let expired = false;
  client.api.onSessionExpired(() => {
    expired = true;
  });
  await assert.rejects(
    client.api.changePassword('Anterior123', 'Nueva456'),
    /Debes iniciar sesión/,
  );
  assert.equal(client.token(), null);
  assert.equal(expired, true);
});

test('native recovery links preserve the token on cold start and in an open app', () => {
  const { redirectSystemPath } = loadSource('app/+native-intent.tsx');
  for (const initial of [true, false]) {
    assert.equal(
      redirectSystemPath({
        path: `rn1://restablecer-contrasena?token=${'c'.repeat(64)}`,
        initial,
      }),
      `/restablecer-contrasena?token=${'c'.repeat(64)}`,
    );
    const expoGo = `exp://192.0.2.1:8081/--/restablecer-contrasena?token=${'c'.repeat(64)}`;
    assert.equal(redirectSystemPath({ path: expoGo, initial }), expoGo);
  }
});

test('password validation measures the bcrypt limit in UTF-8 bytes, including accents and emojis', () => {
  const { getPasswordError } = loadSource('utils/password.ts');
  for (const value of [
    'a1' + 'a'.repeat(70),
    'a1' + 'á'.repeat(35),
    'a1' + '😀'.repeat(17),
  ]) {
    assert.equal(getPasswordError(value), '');
  }
  for (const value of [
    'a1' + 'a'.repeat(71),
    'a1' + 'á'.repeat(36),
    'a1' + '😀'.repeat(18),
  ]) {
    assert.match(getPasswordError(value), /72 bytes/);
  }
});
