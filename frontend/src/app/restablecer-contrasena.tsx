import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Action, Card, Copy, Feedback, Field, Screen } from '@/components/ui';
import { useTask } from '@/hooks/use-task';
import { useSession } from '@/providers/session-provider';
import { resetPassword } from '@/services/apiAccess';
import { getPasswordError } from '@/utils/password';

export default function ResetScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const task = useTask();
  const session = useSession();
  if (!/^[a-f0-9]{64}$/.test(token))
    return (
      <Screen>
        <Card>
          <Copy>El enlace no es válido. Solicita uno nuevo.</Copy>
          <Action
            label="Solicitar enlace"
            onPress={() => router.replace('/recuperar-contrasena')}
          />
        </Card>
      </Screen>
    );
  function submit() {
    void task.run(async () => {
      const error =
        getPasswordError(password) ||
        (password !== confirm ? 'Las contraseñas no coinciden.' : '');
      if (error) throw new Error(error);
      await resetPassword(token, password);
      await session.forget(
        'Contraseña restablecida. Inicia sesión nuevamente.',
      );
      router.replace('/');
    });
  }
  return (
    <Screen>
      <Card>
        <Copy heading="small">Crea una contraseña nueva</Copy>
        <Field
          label="Nueva contraseña"
          value={password}
          onChange={setPassword}
          password
          autoComplete="new-password"
          editable={!task.busy}
        />
        <Copy hint>Mínimo 8 caracteres, con letras y números.</Copy>
        <Field
          label="Confirmar contraseña"
          value={confirm}
          onChange={setConfirm}
          password
          autoComplete="new-password"
          onSubmit={submit}
          editable={!task.busy}
        />
        <Feedback error={task.error} />
        <Action
          label={task.busy ? 'Guardando…' : 'Restablecer contraseña'}
          onPress={submit}
          disabled={task.busy}
        />
        <Action
          label="Solicitar otro enlace"
          link
          onPress={() => router.replace('/recuperar-contrasena')}
          disabled={task.busy}
        />
      </Card>
    </Screen>
  );
}
