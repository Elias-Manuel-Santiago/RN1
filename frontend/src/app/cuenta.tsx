import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  Action,
  Actions,
  Avatar,
  Card,
  Columns,
  Copy,
  Feedback,
  Field,
  Screen,
  Section,
} from '@/components/ui';
import { metrics } from '@/theme';
import { DeleteConfirmation } from '@/components/delete-confirmation';
import { useTask } from '@/hooks/use-task';
import { useSession } from '@/providers/session-provider';
import {
  changePassword,
  deleteOwnAccount,
  updateProfilePicture,
  updateUsername,
} from '@/services/apiAccess';
import { getPasswordError, getUsernameError } from '@/utils/password';
import { pickProfilePicture } from '@/utils/profile-picture';

export default function AccountScreen() {
  const session = useSession();
  const user = session.user;
  const task = useTask();
  const deletion = useTask();
  const nameTask = useTask();
  const photoTask = useTask();
  const passwordTask = useTask();
  const [usernameDraft, setUsername] = useState<string | null>(null);
  const [pictureDraft, setPictureDraft] = useState<{
    value: string | null;
  } | null>(null);
  const username = usernameDraft ?? user?.username ?? '';
  const picture = pictureDraft
    ? pictureDraft.value
    : (user?.profile_picture ?? null);
  function setPicture(value: string | null) {
    setPictureDraft({ value });
  }
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!user) return null;
  const busy =
    task.busy ||
    deletion.busy ||
    nameTask.busy ||
    photoTask.busy ||
    passwordTask.busy;
  function saveName() {
    void nameTask.run(async () => {
      const error = getUsernameError(username);
      if (error) throw new Error(error);
      session.update(await updateUsername(username));
      setUsername(null);
    }, 'Nombre de usuario actualizado.');
  }
  function selectPhoto() {
    void photoTask.run(async () => {
      const selected = await pickProfilePicture();
      if (selected) setPicture(selected);
    });
  }
  function savePhoto() {
    void photoTask.run(async () => {
      session.update(await updateProfilePicture(picture));
      setPictureDraft(null);
    }, 'Foto de perfil actualizada.');
  }
  function savePassword() {
    void passwordTask.run(async () => {
      const error = !current
        ? 'Ingresa tu contraseña actual.'
        : getPasswordError(password) ||
          (current === password
            ? 'La nueva contraseña debe ser distinta de la actual.'
            : '') ||
          (password !== confirm ? 'Las contraseñas no coinciden.' : '');
      if (error) throw new Error(error);
      await changePassword(current, password);
      setCurrent('');
      setPassword('');
      setConfirm('');
    }, 'Contraseña actualizada. Las otras sesiones se cerraron.');
  }
  return (
    <>
      <Screen maxWidth={metrics.accountWidth}>
        <Card style={{ gap: 20 }}>
          <Copy heading>Mi cuenta</Copy>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar name={user.username} picture={picture} />
            <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
              <Copy>
                <Copy bold>Usuario:</Copy> {user.username}
              </Copy>
              <Copy>
                <Copy bold>Email:</Copy> {user.email}
              </Copy>
            </View>
          </View>
          <Columns>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Section>
                <Copy title>Nombre de usuario</Copy>
                <Field
                  label="Nuevo nombre de usuario"
                  value={username}
                  onChange={setUsername}
                  maxLength={100}
                  editable={!busy}
                  onSubmit={saveName}
                />
                <Feedback error={nameTask.error} message={nameTask.message} />
                <Action
                  label="Guardar nombre"
                  onPress={saveName}
                  disabled={busy || username.trim() === user.username}
                />
              </Section>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Section>
                <Copy title>Foto de perfil</Copy>
                <Action
                  label="Elegir imagen"
                  secondary
                  onPress={selectPhoto}
                  disabled={busy}
                />
                <Action
                  label="Quitar foto"
                  secondary
                  onPress={() => setPicture(null)}
                  disabled={busy || !picture}
                />
                <Feedback error={photoTask.error} message={photoTask.message} />
                <Action
                  label="Guardar foto"
                  onPress={savePhoto}
                  disabled={busy || picture === user.profile_picture}
                />
              </Section>
            </View>
          </Columns>
          <Section>
            <Copy title>Cambiar contraseña</Copy>
            <Field
              label="Contraseña actual"
              value={current}
              onChange={setCurrent}
              password
              autoComplete="current-password"
              editable={!busy}
            />
            <Field
              label="Nueva contraseña"
              value={password}
              onChange={setPassword}
              password
              autoComplete="new-password"
              editable={!busy}
            />
            <Copy hint>Mínimo 8 caracteres, con letras y números.</Copy>
            <Field
              label="Confirmar contraseña"
              value={confirm}
              onChange={setConfirm}
              password
              autoComplete="new-password"
              editable={!busy}
              onSubmit={savePassword}
            />
            <Feedback
              error={passwordTask.error}
              message={passwordTask.message}
            />
            <Action
              label={passwordTask.busy ? 'Guardando…' : 'Actualizar contraseña'}
              onPress={savePassword}
              disabled={busy}
            />
          </Section>
          <Feedback error={task.error} message={task.message} />
          <Actions>
            {user.role === 'admin' ? (
              <Action
                label="Administrar usuarios"
                secondary
                compact
                onPress={() => router.push('/admin')}
                disabled={busy}
              />
            ) : null}
            <Action
              label="Cerrar sesión"
              compact
              onPress={() => {
                void task.run(session.signOut);
              }}
              disabled={busy}
            />
            <Action
              label="Eliminar mi cuenta"
              danger
              compact
              onPress={() => {
                deletion.setError('');
                setDeleteOpen(true);
              }}
              disabled={busy}
            />
          </Actions>
        </Card>
      </Screen>
      <DeleteConfirmation
        open={deleteOpen}
        busy={deletion.busy}
        title="¿Eliminar tu cuenta?"
        description="Se eliminarán tu cuenta y sus sesiones. Esta acción no se puede deshacer."
        error={deletion.error}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void deletion.run(async () => {
            await deleteOwnAccount();
            await session.forget('Tu cuenta se eliminó.');
          });
        }}
      />
    </>
  );
}
