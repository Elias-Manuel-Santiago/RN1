import { Stack } from 'expo-router/stack';
import {
  ThemeProvider as NavigationTheme,
  DarkTheme,
  DefaultTheme,
} from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Loading } from '@/components/ui';
import { ThemeButton } from '@/components/theme-button';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { SocialProvider, useSocial } from '@/providers/social-provider';

function Navigation() {
  const session = useSession();
  const social = useSocial();
  const { colors, mode } = useTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  if (session.loading || social.loading)
    return <Loading label="Comprobando sesión…" />;
  return (
    <NavigationTheme
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.accent,
        },
      }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Iniciar sesión' }} />
        <Stack.Screen
          name="restablecer-contrasena"
          options={{ title: 'Nueva contraseña' }}
        />
        <Stack.Screen
          name="recuperar-contrasena"
          options={{ title: 'Recuperar contraseña' }}
        />
        <Stack.Protected guard={!session.user && !social.user}>
          <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
        </Stack.Protected>
        <Stack.Protected
          guard={!!session.user && !session.user.email_verified_at}
        >
          <Stack.Screen
            name="verificar-email"
            options={{ title: 'Verifica tu correo' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!!session.user?.email_verified_at}>
          <Stack.Screen name="cuenta" options={{ title: 'Mi cuenta' }} />
          <Stack.Protected guard={session.user?.role === 'admin'}>
            <Stack.Screen
              name="admin"
              options={{ title: 'Administrar usuarios' }}
            />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={!!social.user}>
          <Stack.Screen
            name="cuenta-auth0"
            options={{ title: 'Sesión iniciada' }}
          />
        </Stack.Protected>
      </Stack>
    </NavigationTheme>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    RN1Courier: require('../../assets/fonts/CourierNew.ttf'),
    RN1CourierBold: require('../../assets/fonts/CourierNewBold.ttf'),
  });
  if (!loaded && !error) return null;
  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <SocialProvider>
          <SessionProvider>
            <Navigation />
          </SessionProvider>
        </SocialProvider>
        <ThemeButton />
      </View>
    </ThemeProvider>
  );
}
