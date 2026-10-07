import { useState } from 'react';
import { router } from 'expo-router';
import { Action, Avatar, Card, Copy, Feedback, Field, Screen } from '@/components/ui';
import { DeleteConfirmation } from '@/components/delete-confirmation';
import { useTask } from '@/hooks/use-task';
import { useSession } from '@/providers/session-provider';
import { changePassword, deleteOwnAccount, updateProfilePicture, updateUsername } from '@/services/apiAccess';
import { getPasswordError, getUsernameError } from '@/utils/password';
import { pickProfilePicture } from '@/utils/profile-picture';

export default function AccountScreen() {
  const session = useSession(); const user = session.user; const task = useTask(); const deletion = useTask();
  const nameTask = useTask(); const photoTask = useTask(); const passwordTask = useTask();
  const [usernameDraft, setUsername] = useState<string | null>(null);
  const [pictureDraft, setPictureDraft] = useState<{ value: string | null } | null>(null);
  const username = usernameDraft ?? user?.username ?? '';
  const picture = pictureDraft ? pictureDraft.value : user?.profile_picture ?? null;
  function setPicture(value: string | null) { setPictureDraft({ value }); }
  const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!user) return null;
  const busy = task.busy || deletion.busy || nameTask.busy || photoTask.busy || passwordTask.busy;
  function saveName() { void nameTask.run(async () => {
    const error = getUsernameError(username); if (error) throw new Error(error);
    session.update(await updateUsername(username)); setUsername(null);
  }, 'Nombre de usuario actualizado.'); }
  function selectPhoto() { void photoTask.run(async () => {
    const selected = await pickProfilePicture(); if (selected) setPicture(selected);
  }); }
  function savePhoto() { void photoTask.run(async () => { session.update(await updateProfilePicture(picture)); setPictureDraft(null); }, 'Foto de perfil actualizada.'); }
  function savePassword() { void passwordTask.run(async () => {
    const error = !current ? 'Ingresa tu contraseña actual.' : getPasswordError(password)
      || (password !== confirm ? 'Las contraseñas no coinciden.' : '');
    if (error) throw new Error(error);
    await changePassword(current, password); setCurrent(''); setPassword(''); setConfirm('');
  }, 'Contraseña actualizada. Las otras sesiones se cerraron.'); }
  return <><Screen>
    <Card><Avatar name={user.username} picture={user.profile_picture} /><Copy title>{user.username}</Copy>
      <Copy>{user.email}</Copy><Copy>Correo verificado · {user.role === 'admin' ? 'Administrador' : 'Usuario'}</Copy>
    </Card>
    <Card><Copy title>Nombre de usuario</Copy>
      <Field label="Usuario" value={username} onChange={setUsername} maxLength={100} editable={!busy} onSubmit={saveName} />
      <Feedback error={nameTask.error} message={nameTask.message} />
      <Action label="Guardar nombre" onPress={saveName} disabled={busy || username.trim() === user.username} />
    </Card>
    <Card><Copy title>Foto de perfil</Copy><Avatar name={user.username} picture={picture} />
      <Action label="Elegir imagen" secondary onPress={selectPhoto} disabled={busy} />
      <Action label="Quitar foto" secondary onPress={() => setPicture(null)} disabled={busy || !picture} />
      <Feedback error={photoTask.error} message={photoTask.message} />
      <Action label="Guardar foto" onPress={savePhoto} disabled={busy || picture === user.profile_picture} />
    </Card>
    <Card><Copy title>Cambiar contraseña</Copy>
      <Field label="Contraseña actual" value={current} onChange={setCurrent} password autoComplete="current-password" editable={!busy} />
      <Field label="Nueva contraseña" value={password} onChange={setPassword} password autoComplete="new-password" editable={!busy} />
      <Copy>Mínimo 8 caracteres, con letras y números.</Copy>
      <Field label="Confirmar contraseña" value={confirm} onChange={setConfirm} password autoComplete="new-password" editable={!busy} onSubmit={savePassword} />
      <Feedback error={passwordTask.error} message={passwordTask.message} />
      <Action label="Actualizar contraseña" onPress={savePassword} disabled={busy} />
    </Card>
    {user.role === 'admin' ? <Action label="Administrar usuarios" onPress={() => router.push('/admin')} disabled={busy} /> : null}
    <Feedback error={task.error} message={task.message} />
    <Action label="Cerrar sesión" secondary onPress={() => { void task.run(session.signOut); }} disabled={busy} />
    <Action label="Eliminar mi cuenta" danger secondary onPress={() => { deletion.setError(''); setDeleteOpen(true); }} disabled={busy} />
  </Screen>
  <DeleteConfirmation open={deleteOpen} busy={deletion.busy} title="¿Eliminar tu cuenta?"
    description="Se eliminarán tu cuenta y sus sesiones. Esta acción no se puede deshacer."
    error={deletion.error} onCancel={() => setDeleteOpen(false)} onConfirm={() => { void deletion.run(async () => {
      await deleteOwnAccount(); await session.forget('Tu cuenta se eliminó.');
    }); }} />
  </>;
}
