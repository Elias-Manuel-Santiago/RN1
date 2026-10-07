import { useState } from 'react';
import { router } from 'expo-router';
import { Action, Card, Copy, Feedback, Field, Screen } from '@/components/ui';
import { useTask } from '@/hooks/use-task';
import { requestPasswordRecovery } from '@/services/apiAccess';
import { getEmailError } from '@/utils/password';

export default function RecoveryScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const task = useTask();
  function submit() {
    void task.run(async () => {
      const error = getEmailError(email);
      if (error) throw new Error(error);
      setSent((await requestPasswordRecovery(email)).message);
    });
  }
  return (
    <Screen>
      <Card>
        <Copy heading="small">Recuperar contraseña</Copy>
        <Copy style={{ marginVertical: 16 }}>
          Ingresa tu email y te enviaremos un enlace único.
        </Copy>
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          keyboardType="email-address"
          maxLength={100}
          editable={!task.busy}
          onSubmit={submit}
        />
        <Feedback error={task.error} message={sent} />
        <Action
          label={task.busy ? 'Enviando…' : 'Enviar enlace'}
          onPress={submit}
          disabled={task.busy}
        />
        <Action
          label="Volver a iniciar sesión"
          link
          onPress={() => router.replace('/')}
          disabled={task.busy}
        />
      </Card>
    </Screen>
  );
}
