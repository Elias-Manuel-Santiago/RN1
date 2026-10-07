import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Action,
  Actions,
  Avatar,
  Card,
  Copy,
  Feedback,
  Field,
  Loading,
} from '@/components/ui';
import { metrics, pagePadding } from '@/theme';
import { DeleteConfirmation } from '@/components/delete-confirmation';
import { useTask } from '@/hooks/use-task';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '@/services/apiAccess';
import type { AdminUser } from '@/types/user';
import { getUsernameError } from '@/utils/password';
import { pickProfilePicture } from '@/utils/profile-picture';

export default function AdminScreen() {
  const session = useSession();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width > metrics.mobileBreakpoint;
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<AdminUser | null>(null);
  const deletion = useTask();
  const generation = useRef(0);
  async function load(search: string) {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers(search);
      if (current === generation.current) setUsers(data);
    } catch (caught) {
      if (current === generation.current)
        setError(
          caught instanceof Error
            ? caught.message
            : 'No se pudo cargar la lista.',
        );
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    const current = ++generation.current;
    getAdminUsers('')
      .then((data) => {
        if (active && current === generation.current) setUsers(data);
      })
      .catch((caught) => {
        if (active && current === generation.current)
          setError(
            caught instanceof Error
              ? caught.message
              : 'No se pudo cargar la lista.',
          );
      })
      .finally(() => {
        if (active && current === generation.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(
    id: number,
    changes: { username?: string; profilePicture?: string | null },
  ) {
    const updated = await updateAdminUser(id, changes);
    setUsers(
      (current) =>
        current?.map((user) => (user.id === id ? updated : user)) ?? null,
    );
    await session.refresh();
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        paddingHorizontal: pagePadding(width),
        paddingTop: Math.max(32, insets.top + 16),
        paddingBottom: Math.max(32, insets.bottom + 16),
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: metrics.adminWidth,
          alignSelf: 'center',
          flexShrink: 1,
          maxHeight: '100%',
        }}
      >
        <FlatList
          data={users ?? []}
          keyExtractor={(user) => String(user.id)}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          refreshing={loading && users !== null}
          onRefresh={() => {
            void load(query);
          }}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 6, paddingRight: 6 }}
          ListHeaderComponent={
            <View style={{ gap: 24 }}>
              <View
                style={{
                  flexDirection: wide ? 'row' : 'column',
                  alignItems: wide ? 'flex-end' : 'stretch',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <Copy heading>Administrar usuarios</Copy>
                <Action
                  label="Volver a mi cuenta"
                  secondary
                  compact
                  onPress={() => router.replace('/cuenta')}
                />
              </View>
              <View
                style={{
                  flexDirection: wide ? 'row' : 'column',
                  alignItems: wide ? 'flex-end' : 'stretch',
                  gap: 16,
                }}
              >
                <View style={{ flex: wide ? 1 : undefined }}>
                  <Field
                    label="Buscar por nombre o email"
                    placeholder="Ej. ana o ana@email.com"
                    value={query}
                    onChange={setQuery}
                    maxLength={100}
                    returnKeyType="search"
                    onSubmit={() => {
                      void load(query);
                    }}
                  />
                </View>
                <Action
                  label={loading ? 'Buscando…' : 'Buscar'}
                  disabled={loading}
                  onPress={() => {
                    void load(query);
                  }}
                />
              </View>
              <Feedback error={error} />
              {error ? (
                <Action
                  label="Reintentar"
                  secondary
                  onPress={() => {
                    void load(query);
                  }}
                  disabled={loading}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <Loading label="Cargando usuarios…" />
            ) : error ? null : (
              <View style={{ gap: 16 }}>
                <Copy>No hay usuarios que coincidan.</Copy>
                <Action
                  label="Mostrar todos"
                  secondary
                  onPress={() => {
                    setQuery('');
                    void load('');
                  }}
                />
              </View>
            )
          }
          renderItem={({ item }) => (
            <AdminRow
              user={item}
              onSave={save}
              disabled={deletion.busy}
              onDelete={() => {
                deletion.setError('');
                setPending(item);
              }}
            />
          )}
        />
      </Card>
      <DeleteConfirmation
        open={!!pending}
        busy={deletion.busy}
        title="¿Eliminar usuario?"
        description={`Se eliminará la cuenta de ${pending?.username ?? ''} y sus sesiones. Esta acción no se puede deshacer.`}
        error={deletion.error}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending)
            void deletion.run(async () => {
              await deleteAdminUser(pending.id);
              setUsers(
                (current) =>
                  current?.filter((user) => user.id !== pending.id) ?? null,
              );
              setPending(null);
            });
        }}
      />
    </View>
  );
}
function AdminRow({
  user,
  onSave,
  onDelete,
  disabled,
}: {
  user: AdminUser;
  onSave: (
    id: number,
    changes: { username?: string; profilePicture?: string | null },
  ) => Promise<void>;
  onDelete: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width > metrics.mobileBreakpoint;
  const [usernameDraft, setUsername] = useState<string | null>(null);
  const [pictureDraft, setPictureDraft] = useState<{
    value: string | null;
  } | null>(null);
  const username = usernameDraft ?? user.username;
  const picture = pictureDraft ? pictureDraft.value : user.profile_picture;
  function setPicture(value: string | null) {
    setPictureDraft({ value });
  }
  const task = useTask();
  const busy = task.busy || disabled;
  function save() {
    void task.run(async () => {
      const error = getUsernameError(username);
      if (error) throw new Error(error);
      await onSave(user.id, {
        username: username.trim(),
        profilePicture: picture,
      });
      setUsername(null);
      setPictureDraft(null);
    }, 'Usuario actualizado.');
  }
  return (
    <View
      style={{
        padding: 16,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.muted,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'flex-end' : 'stretch',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <View
          style={{
            flex: wide ? 1.15 : undefined,
            minWidth: wide ? 256 : 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Avatar picture={picture} name={user.username} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Copy>
              <Copy bold>ID:</Copy> {user.id}
            </Copy>
            <Copy>
              <Copy bold>Email:</Copy> {user.email}
            </Copy>
            <Copy>
              <Copy bold>Rol:</Copy> {user.role}
            </Copy>
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, minWidth: wide ? 256 : 0 }}>
          <Field
            label="Nombre de usuario"
            value={username}
            onChange={setUsername}
            editable={!busy}
            maxLength={100}
            onSubmit={save}
          />
        </View>
        <Action
          label={task.busy ? 'Guardando…' : 'Guardar cambios'}
          onPress={save}
          disabled={
            busy ||
            (username.trim() === user.username &&
              picture === user.profile_picture)
          }
        />
      </View>
      <Actions>
        <Action
          label="Elegir foto"
          secondary
          disabled={busy}
          onPress={() => {
            void task.run(async () => {
              const selected = await pickProfilePicture();
              if (selected) setPicture(selected);
            });
          }}
        />
        <Action
          label="Quitar foto"
          secondary
          disabled={busy || !picture}
          onPress={() => setPicture(null)}
        />
        <Action
          label="Eliminar usuario"
          danger
          onPress={onDelete}
          disabled={busy}
        />
      </Actions>
      <Feedback error={task.error} message={task.message} />
    </View>
  );
}
