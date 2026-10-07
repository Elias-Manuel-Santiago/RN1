import { type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import {
  Auth0Provider,
  useAuth0,
  type WebAuth0Options,
} from 'react-native-auth0';
import { SocialContext } from './social-context';

function Bridge({ children }: PropsWithChildren) {
  const { user, isLoading, error, authorize, clearSession } = useAuth0();
  async function signIn(connection: string) {
    if (Platform.OS === 'web') {
      await authorize({
        scope: 'openid profile email',
        connection,
        redirectUrl: window.location.origin,
      });
    } else {
      await authorize(
        { scope: 'openid profile email offline_access', connection },
        { customScheme: 'rn1' },
      );
    }
  }
  async function signOut() {
    if (Platform.OS === 'web')
      await clearSession({ returnToUrl: window.location.origin });
    else await clearSession({}, { customScheme: 'rn1' });
  }
  return (
    <SocialContext
      value={{
        enabled: true,
        loading: isLoading,
        error: error?.message,
        user: user ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </SocialContext>
  );
}
export default function Auth0SocialProvider({
  children,
  domain,
  clientId,
}: PropsWithChildren<{ domain: string; clientId: string }>) {
  // Let the SDK restore an unexpired web session even when third-party cookies are blocked.
  const options: WebAuth0Options = {
    domain,
    clientId,
    ...(Platform.OS === 'web'
      ? { cacheLocation: 'localstorage' as const }
      : {}),
  };
  return (
    <Auth0Provider {...options}>
      <Bridge>{children}</Bridge>
    </Auth0Provider>
  );
}
