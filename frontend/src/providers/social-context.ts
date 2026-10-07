import { createContext } from 'react';
export type SocialUser = {
  name?: string;
  nickname?: string;
  email?: string;
  picture?: string;
};
export type Social = {
  enabled: boolean;
  loading: boolean;
  error?: string;
  unavailableReason?: string;
  user: SocialUser | null;
  signIn: (connection: string) => Promise<void>;
  signOut: () => Promise<void>;
};
export const unavailable: Social = {
  enabled: false,
  loading: false,
  user: null,
  signIn: async () => {
    throw new Error('Auth0 no está configurado.');
  },
  signOut: async () => {},
};
export const SocialContext = createContext<Social>(unavailable);
