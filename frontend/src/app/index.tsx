import { useState } from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Action, AuthLayout, Copy, Feedback, Field } from '@/components/ui';
import { SocialButtons } from '@/components/social-buttons';
import { useTask } from '@/hooks/use-task';
import { useSession } from '@/providers/session-provider';
import { useSocial } from '@/providers/social-provider';
import { login } from '@/services/apiAccess';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const task = useTask();
  const session = useSession();
  const social = useSocial();
  if (session.user)
    return (
      <Redirect
        href={session.user.email_verified_at ? '/cuenta' : '/verificar-email'}
      />
    );
  if (social.user) return <Redirect href="/cuenta-auth0" />;
  function submit() {
    void task.run(async () => {
      if (!identifier.trim() || !password)
        throw new Error('Completa usuario o email y contraseña.');
      session.accept(await login(identifier, password));
    });
  }
  return (
    <AuthLayout
      alternatives={
        social.enabled || social.unavailableReason ? (
          <SocialButtons busy={task.busy} run={task.run} />
        ) : undefined
      }
    >
      <Copy heading>Iniciar sesión</Copy>
      <Feedback message={session.notice} />
      <Feedback error={session.startupError} />
      {session.startupError ? (
        <Action
          label="Reintentar conexión"
          secondary
          onPress={session.retry}
          disabled={task.busy}
        />
      ) : null}
      <Field
        label="Usuario o email"
        value={identifier}
        onChange={setIdentifier}
        autoComplete="username"
        maxLength={100}
        editable={!task.busy}
      />
      <Field
        label="Contraseña"
        value={password}
        onChange={setPassword}
        password
        autoComplete="current-password"
        editable={!task.busy}
        onSubmit={submit}
      />
      <Feedback error={task.error} />
      <Action
        label={task.busy ? 'Ingresando…' : 'Ingresar'}
        onPress={submit}
        disabled={task.busy}
        testID="login-submit"
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Copy>¿No tienes cuenta?</Copy>
        <Action
          label="Regístrate"
          link
          onPress={() => router.push('/registro')}
          disabled={task.busy}
        />
      </View>
      <Action
        label="Olvidé mi contraseña"
        link
        onPress={() => router.push('/recuperar-contrasena')}
        disabled={task.busy}
      />
    </AuthLayout>
  );
}
