import { Button, Host, Text as NativeText, TextInput, useNativeState, type TextInputProps } from '@expo/ui';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/providers/theme-provider';

export function Screen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 20 }}>{children}</View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
export function Card({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={{ padding: 20, gap: 16, backgroundColor: colors.surface, borderRadius: 16,
    borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border }}>{children}</View>;
}
export function Copy({ children, title = false }: PropsWithChildren<{ title?: boolean }>) {
  const { colors } = useTheme();
  return <Text selectable style={{ color: title ? colors.text : colors.secondary,
    fontSize: title ? 20 : 16, fontWeight: title ? '700' : '400', lineHeight: title ? 27 : 24 }}>{children}</Text>;
}
export function Action({ label, onPress, disabled, secondary = false, danger = false, testID }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; testID?: string;
}) {
  const { mode, colors } = useTheme();
  return <Host style={{ width: '100%' }} matchContents={{ vertical: true }} colorScheme={mode} seedColor={danger ? colors.danger : colors.accent}>
    <Button onPress={onPress} disabled={disabled} variant={secondary ? 'outlined' : 'filled'}
      style={{ width: '100%', paddingVertical: 12 }} testID={testID}>
      <NativeText textStyle={{ fontSize: 16, fontWeight: '600', color: secondary ? (danger ? colors.danger : colors.text) : colors.surface }}>{label}</NativeText>
    </Button>
  </Host>;
}
export function Field({ label, value, onChange, password = false, onSubmit, ...props }: Omit<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing'> & {
  label: string; value: string; onChange: (value: string) => void; password?: boolean; onSubmit?: () => void;
}) {
  const { mode, colors } = useTheme();
  const text = useNativeState(value);
  const [visible, setVisible] = useState(false);
  // Native state owns keystrokes; React only pushes programmatic changes (e.g. a cleared form).
  useEffect(() => { if (text.get() !== value) text.set(value); }, [value, text]);
  return <View style={{ gap: 8 }}>
    <Copy>{label}</Copy>
    <Host style={{ width: '100%' }} matchContents={{ vertical: true }} colorScheme={mode} seedColor={colors.accent}>
      <TextInput value={text} onChangeText={onChange} autoCapitalize="none" autoCorrect={false}
        placeholder={label} placeholderTextColor={colors.secondary} secureTextEntry={password && !visible}
        returnKeyType={onSubmit ? 'done' : 'next'} onSubmitEditing={onSubmit ? () => onSubmit() : undefined}
        style={{ width: '100%', padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.muted }}
        textStyle={{ color: colors.text, fontSize: 17 }} {...props} />
    </Host>
    {password && <Action label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} secondary onPress={() => setVisible(!visible)} />}
  </View>;
}
export function Feedback({ error, message }: { error?: string; message?: string }) {
  const { colors } = useTheme();
  if (!error && !message) return null;
  return <Text accessibilityRole={error ? 'alert' : 'text'} accessibilityLiveRegion="polite"
    style={{ color: error ? colors.danger : colors.success, fontSize: 16, lineHeight: 24 }}>{error || message}</Text>;
}
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { colors } = useTheme();
  return <View style={{ padding: 30, gap: 16, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /><Copy>{label}</Copy></View>;
}
export function Avatar({ picture, name }: { picture: string | null | undefined; name: string }) {
  const { colors } = useTheme();
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  return picture && failedPicture !== picture ? <Image source={{ uri: picture }} onError={() => setFailedPicture(picture)} accessibilityLabel={`Foto de ${name}`}
    style={{ width: 76, height: 76, borderRadius: 38 }} contentFit="cover" />
    : <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700' }}>{name.slice(0, 1).toUpperCase()}</Text></View>;
}
