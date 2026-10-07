import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import * as api from '@/services/apiAccess';
import type { User } from '@/types/user';

type Session = {
  user: User | null;
  loading: boolean;
  startupError: string;
  notice: string;
  expiresAt: string | null;
  accept: (response: api.AuthenticatedResponse) => void;
  update: (user: User) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  forget: (message?: string) => Promise<void>;
  setExpiresAt: (value: string) => void;
  retry: () => void;
};
const SessionContext = createContext<Session | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState('');
  const [notice, setNotice] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const restore = useCallback(async () => {
    try {
      setUser(await api.getCurrentUser());
      setStartupError('');
    } catch (error) {
      if (error instanceof api.ApiError && error.status === 401) setUser(null);
      else
        setStartupError(
          error instanceof Error
            ? error.message
            : 'No se pudo comprobar la sesión.',
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const unsubscribe = api.onSessionExpired(() => {
      setUser(null);
      setExpiresAt(null);
      setNotice('Tu sesión expiró. Inicia sesión nuevamente.');
    });
    let active = true;
    api
      .getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof api.ApiError && error.status === 401)
          setUser(null);
        else
          setStartupError(
            error instanceof Error
              ? error.message
              : 'No se pudo comprobar la sesión.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  const refresh = useCallback(async () => {
    setUser(await api.getCurrentUser());
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) void refresh().catch(() => {});
    });
    return () => subscription.remove();
  }, [user, refresh]);
  async function forget(message = '') {
    await api.clearLocalSession();
    setUser(null);
    setExpiresAt(null);
    setNotice(message);
  }
  async function signOut() {
    await api.logout();
    await forget('Sesión cerrada.');
  }
  function accept(response: api.AuthenticatedResponse) {
    setUser(response.usuario);
    setExpiresAt(response.verificationExpiresAt);
    setNotice('');
    setStartupError('');
  }
  return (
    <SessionContext
      value={{
        user,
        loading,
        startupError,
        notice,
        expiresAt,
        accept,
        update: setUser,
        refresh,
        signOut,
        forget,
        setExpiresAt,
        retry: () => {
          setLoading(true);
          setStartupError('');
          void restore();
        },
      }}
    >
      {children}
    </SessionContext>
  );
}
export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error('SessionProvider is missing');
  return session;
}
