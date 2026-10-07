import { Action, Avatar, Card, Copy, Feedback, Screen } from '@/components/ui';
import { useTask } from '@/hooks/use-task';
import { useSocial } from '@/providers/social-provider';

export default function SocialAccountScreen() {
  const social = useSocial(); const task = useTask(); const user = social.user;
  if (!user) return null;
  const name = [user.name, user.nickname].find((value) => value?.trim() && value.toLowerCase() !== user.email?.toLowerCase()) ?? 'Usuario de Auth0';
  return <Screen><Card><Avatar picture={user.picture} name={name} /><Copy title>{name}</Copy><Copy>{user.email}</Copy>
    <Copy>Los datos de perfiles sociales se administran desde su proveedor de acceso.</Copy>
    <Feedback error={task.error} /><Action label={task.busy ? 'Cerrando sesión…' : 'Cerrar sesión'} disabled={task.busy}
      onPress={() => { void task.run(social.signOut); }} />
  </Card></Screen>;
}
