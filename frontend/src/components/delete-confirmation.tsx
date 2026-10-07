import { Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { hardShadow, metrics } from '@/theme';
import { Action, Actions, Card, Copy, Feedback } from './ui';

export function DeleteConfirmation({
  open,
  busy,
  title,
  description,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  title: string;
  description: string;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: Math.max(20, insets.top),
            paddingBottom: Math.max(20, insets.bottom),
          }}
        >
          <View
            accessibilityViewIsModal
            style={{ width: '100%', maxWidth: metrics.dialogWidth }}
          >
            <Card
              style={{
                padding: Math.min(36, Math.max(24, width * 0.05)),
                boxShadow: hardShadow(colors.shadow, 9),
              }}
            >
              <Copy title style={{ fontSize: 24, lineHeight: 28.8 }}>
                {title}
              </Copy>
              <Copy>{description}</Copy>
              <Feedback error={error} />
              <Actions dialog>
                <Action
                  label="Cancelar"
                  secondary
                  compact
                  onPress={onCancel}
                  disabled={busy}
                />
                <Action
                  label={busy ? 'Eliminando…' : 'Eliminar definitivamente'}
                  danger
                  compact
                  onPress={onConfirm}
                  disabled={busy}
                />
              </Actions>
            </Card>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
