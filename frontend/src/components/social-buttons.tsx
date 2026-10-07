import { Text, View, useWindowDimensions } from 'react-native';
import { useSocial } from '@/providers/social-provider';
import { useTheme } from '@/providers/theme-provider';
import { fonts, metrics } from '@/theme';
import { Action, Copy, Feedback } from './ui';

export function SocialButtons({
  busy,
  run,
  mode = 'login',
}: {
  busy: boolean;
  run: (task: () => Promise<void>) => Promise<void>;
  mode?: 'login' | 'register';
}) {
  const social = useSocial();
  const { colors, mode: theme } = useTheme();
  const { width } = useWindowDimensions();
  if (!social.enabled && !social.unavailableReason) return null;
  const wide = width > metrics.mobileBreakpoint;
  const gap = Math.min(56, Math.max(24, width * 0.04));
  const action = mode === 'register' ? 'Registrarte' : 'Continuar';
  const options = [
    {
      label: 'Google',
      connection: 'google-oauth2',
      icon: require('../../assets/social/logoGoogle.png'),
    },
    {
      label: 'GitHub',
      connection: 'github',
      icon:
        theme === 'dark'
          ? require('../../assets/social/logoGitHubBlanco.png')
          : require('../../assets/social/logoGitHubNegro.png'),
    },
    {
      label: 'Apple',
      connection: 'apple',
      icon:
        theme === 'dark'
          ? require('../../assets/social/logoAppleBlanco.png')
          : require('../../assets/social/logoAppleNegro.png'),
    },
  ];
  return (
    <View
      style={{
        flex: wide ? 1 : undefined,
        gap: 20,
        justifyContent: 'center',
        paddingLeft: wide ? gap : 0,
        paddingTop: wide ? 0 : 24,
        borderLeftWidth: wide ? 2 : 0,
        borderTopWidth: wide ? 0 : 2,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.bold,
            fontSize: 12.48,
            fontWeight: '900',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          O {mode === 'register' ? 'regístrate' : 'continúa'} con
        </Text>
        <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />
      </View>
      <Feedback error={social.error} />
      {social.unavailableReason ? (
        <Copy hint>{social.unavailableReason}</Copy>
      ) : null}
      <View style={{ gap: 12 }}>
        {options.map(({ label, connection, icon }) => (
          <Action
            key={connection}
            label={`${action} con ${label}`}
            icon={icon}
            secondary
            disabled={busy || social.loading || !social.enabled}
            onPress={() => {
              void run(() => social.signIn(connection));
            }}
          />
        ))}
      </View>
    </View>
  );
}
