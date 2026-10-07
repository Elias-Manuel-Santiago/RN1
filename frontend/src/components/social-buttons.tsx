import { useSocial } from '@/providers/social-provider';
import { Action, Copy } from './ui';

export function SocialButtons({ busy, run }: { busy: boolean; run: (task: () => Promise<void>) => Promise<void> }) {
  const social = useSocial();
  if (!social.enabled) return null;
  return <><Copy>O continúa con</Copy>{[
    ['Google', 'google-oauth2'], ['GitHub', 'github'], ['Apple', 'apple'],
  ].map(([label, connection]) => <Action key={connection} label={label} secondary disabled={busy || social.loading}
    onPress={() => { void run(() => social.signIn(connection)); }} />)}</>;
}
