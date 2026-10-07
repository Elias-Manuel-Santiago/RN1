// Expo passes the static app.json config here. Only enable Auth0 when its public settings exist.
module.exports = ({ config }) => {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
  if (Boolean(domain) !== Boolean(clientId)) throw new Error('Set both EXPO_PUBLIC_AUTH0_DOMAIN and EXPO_PUBLIC_AUTH0_CLIENT_ID.');
  return {
    ...config,
    name: 'RN1', slug: 'rn1', scheme: 'rn1',
    ios: { ...config.ios, bundleIdentifier: 'com.elias.rn1' },
    android: { ...config.android, package: 'com.elias.rn1' },
    plugins: [...(config.plugins ?? []).filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'react-native-auth0'),
      ['expo-image-picker', { photosPermission: 'Permite elegir una foto de perfil.', cameraPermission: false, microphonePermission: false }],
      ...(domain && clientId ? [['react-native-auth0', { domain, customScheme: 'rn1' }]] : []),
    ],
  };
};
