import { BottomSheet, Button, Column, Host, Text } from '@expo/ui';
import { useTheme } from '@/providers/theme-provider';

export function DeleteConfirmation({ open, busy, title, description, error, onCancel, onConfirm }: {
  open: boolean; busy: boolean; title: string; description: string; error?: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  const { mode, colors } = useTheme();
  return <Host style={{ position: 'absolute' }} pointerEvents="box-none" colorScheme={mode} seedColor={colors.danger}>
    <BottomSheet isPresented={open} onDismiss={() => { if (!busy) onCancel(); }}
      shouldDismissOnBackPress={!busy} shouldDismissOnClickOutside={!busy} containerColor={colors.surface}>
      <Column style={{ padding: 24, backgroundColor: colors.surface }}>
        <Text textStyle={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Text textStyle={{ fontSize: 16, color: colors.text }} style={{ paddingVertical: 16 }}>{description}</Text>
        {error ? <Text textStyle={{ color: colors.danger }}>{error}</Text> : null}
        <Button label={busy ? 'Eliminando…' : 'Eliminar definitivamente'} onPress={onConfirm} disabled={busy} />
        <Button label="Cancelar" variant="text" onPress={onCancel} disabled={busy} />
      </Column>
    </BottomSheet>
  </Host>;
}
