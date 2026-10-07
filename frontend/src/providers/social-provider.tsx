import { lazy, Suspense, use, type PropsWithChildren } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { Loading } from '@/components/ui';
import { SocialContext, unavailable } from './social-context';

// The Auth0 SDK enforces a native module at import time. Load it only in a configured development build.
const Auth0SocialProvider = lazy(() => import('./social-auth0'));
const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
export function SocialProvider({ children }: PropsWithChildren) {
  if (!domain || !clientId || Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return <SocialContext value={unavailable}>{children}</SocialContext>;
  }
  return <Suspense fallback={<Loading label="Preparando autenticación…" />}>
    <Auth0SocialProvider domain={domain} clientId={clientId}>{children}</Auth0SocialProvider>
  </Suspense>;
}
export function useSocial() { return use(SocialContext); }
