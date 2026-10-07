import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Action, Avatar, Card, Copy, Feedback, Field, Loading } from '@/components/ui';
import { DeleteConfirmation } from '@/components/delete-confirmation';
import { useTask } from '@/hooks/use-task';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
import { deleteAdminUser, getAdminUsers, updateAdminUser } from '@/services/apiAccess';
import type { AdminUser } from '@/types/user';
import { getUsernameError } from '@/utils/password';
import { pickProfilePicture } from '@/utils/profile-picture';

export default function AdminScreen() {
  const session = useSession(); const { colors } = useTheme(); const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(''); const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [pending, setPending] = useState<AdminUser | null>(null); const deletion = useTask();
  const generation = useRef(0);
  async function load(search: string) {
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const data = await getAdminUsers(search);
      if (current === generation.current) setUsers(data);
    } catch (caught) {
      if (current === generation.current) setError(caught instanceof Error ? caught.message : 'No se pudo cargar la lista.');
    } finally { if (current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    let active = true; const current = ++generation.current;
    getAdminUsers('').then((data) => { if (active && current === generation.current) setUsers(data); })
      .catch((caught) => { if (active && current === generation.current) setError(caught instanceof Error ? caught.message : 'No se pudo cargar la lista.'); })
      .finally(() => { if (active && current === generation.current) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function save(id: number, changes: { username?: string; profilePicture?: string | null }) {
    const updated = await updateAdminUser(id, changes);
    setUsers((current) => current?.map((user) => user.id === id ? updated : user) ?? null);
    await session.refresh();
  }
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={users ?? []} keyExtractor={(user) => String(user.id)} contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled" refreshing={loading && users !== null} onRefresh={() => { void load(query); }}
      contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 20, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}
      ListHeaderComponent={<Card><Copy>Busca por nombre o email. Se muestran hasta 100 usuarios.</Copy>
        <Field label="Buscar usuarios" value={query} onChange={setQuery} maxLength={100} returnKeyType="search" onSubmit={() => { void load(query); }} />
        <Action label={loading ? 'Buscando…' : 'Buscar'} disabled={loading} onPress={() => { void load(query); }} />
        <Feedback error={error} />{error ? <Action label="Reintentar" secondary onPress={() => { void load(query); }} disabled={loading} /> : null}
      </Card>}
      ListEmptyComponent={loading ? <Loading label="Cargando usuarios…" /> : error ? null : <Card><Copy>No hay usuarios que coincidan.</Copy>
        <Action label="Mostrar todos" secondary onPress={() => { setQuery(''); void load(''); }} /></Card>}
      renderItem={({ item }) => <AdminRow user={item} onSave={save} disabled={deletion.busy}
        onDelete={() => { deletion.setError(''); setPending(item); }} />} />
    <DeleteConfirmation open={!!pending} busy={deletion.busy} title="¿Eliminar usuario?"
      description={`Se eliminará la cuenta de ${pending?.username ?? ''} y sus sesiones. Esta acción no se puede deshacer.`}
      error={deletion.error} onCancel={() => setPending(null)} onConfirm={() => { if (pending) void deletion.run(async () => {
        await deleteAdminUser(pending.id); setUsers((current) => current?.filter((user) => user.id !== pending.id) ?? null); setPending(null);
      }); }} />
  </View>;
}
function AdminRow({ user, onSave, onDelete, disabled }: {
  user: AdminUser; onSave: (id: number, changes: { username?: string; profilePicture?: string | null }) => Promise<void>;
  onDelete: () => void; disabled: boolean;
}) {
  const [usernameDraft, setUsername] = useState<string | null>(null);
  const [pictureDraft, setPictureDraft] = useState<{ value: string | null } | null>(null);
  const username = usernameDraft ?? user.username;
  const picture = pictureDraft ? pictureDraft.value : user.profile_picture;
  function setPicture(value: string | null) { setPictureDraft({ value }); }
  const task = useTask(); const busy = task.busy || disabled;
  function save() { void task.run(async () => {
    const error = getUsernameError(username); if (error) throw new Error(error);
    await onSave(user.id, { username: username.trim(), profilePicture: picture });
    setUsername(null); setPictureDraft(null);
  }, 'Usuario actualizado.'); }
  return <Card><Avatar picture={picture} name={user.username} /><Copy title>{user.username}</Copy><Copy>{user.email}</Copy>
    <Copy>{user.role === 'admin' ? 'Administrador' : 'Usuario'} · {user.email_verified_at ? 'Verificado' : 'Sin verificar'}</Copy>
    <Field label="Nombre de usuario" value={username} onChange={setUsername} editable={!busy} maxLength={100} onSubmit={save} />
    <Action label="Elegir foto" secondary disabled={busy} onPress={() => { void task.run(async () => {
      const selected = await pickProfilePicture(); if (selected) setPicture(selected);
    }); }} />
    <Action label="Quitar foto" secondary disabled={busy || !picture} onPress={() => setPicture(null)} />
    <Feedback error={task.error} message={task.message} />
    <Action label={task.busy ? 'Guardando…' : 'Guardar cambios'} onPress={save} disabled={busy || (username.trim() === user.username && picture === user.profile_picture)} />
    <Action label="Eliminar usuario" danger secondary onPress={onDelete} disabled={busy} />
  </Card>;
}
