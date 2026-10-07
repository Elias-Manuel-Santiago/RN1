import { type PropsWithChildren } from 'react';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';
import { SocialContext } from './social-context';

function Bridge({ children }: PropsWithChildren) {
  const { user, isLoading, authorize, clearSession } = useAuth0();
  async function signIn(connection: string) {
    await authorize({ scope: 'openid profile email offline_access', connection }, { customScheme: 'rn1' });
  }
  async function signOut() { await clearSession({}, { customScheme: 'rn1' }); }
  return <SocialContext value={{ enabled: true, loading: isLoading, user: user ?? null, signIn, signOut }}>{children}</SocialContext>;
}
export default function Auth0SocialProvider({ children, domain, clientId }: PropsWithChildren<{ domain: string; clientId: string }>) {
  return <Auth0Provider domain={domain} clientId={clientId}><Bridge>{children}</Bridge></Auth0Provider>;
}
