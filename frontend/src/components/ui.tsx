import {
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, type ImageSource } from 'expo-image';
import { useTheme } from '@/providers/theme-provider';
import {
  cardPadding,
  fonts,
  hardShadow,
  metrics,
  pagePadding,
  titleSize,
} from '@/theme';

export function Screen({
  children,
  maxWidth = metrics.authWidth,
}: PropsWithChildren<{ maxWidth?: number }>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: pagePadding(width),
          paddingTop: Math.max(32, insets.top + 16),
          paddingBottom: Math.max(32, insets.bottom + 16),
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth,
            alignSelf: 'center',
            gap: metrics.gap,
          }}
        >
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <View
      style={[
        {
          padding: cardPadding(width),
          gap: metrics.gap,
          backgroundColor: colors.surface,
          borderRadius: metrics.radius,
          borderWidth: metrics.border,
          borderColor: colors.border,
          boxShadow: hardShadow(
            colors.shadow,
            width <= metrics.smallBreakpoint ? 6 : 9,
          ),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Copy({
  children,
  title = false,
  heading = false,
  hint = false,
  bold = false,
  style,
}: PropsWithChildren<{
  title?: boolean;
  heading?: boolean | 'small';
  hint?: boolean;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
}>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const size = title
    ? 18.4
    : heading === 'small'
      ? 24.8
      : heading
        ? titleSize(width)
        : hint
          ? 12.16
          : 16;
  return (
    <Text
      selectable
      accessibilityRole={title || heading ? 'header' : undefined}
      style={[
        {
          color: colors.text,
          fontFamily: title || heading || bold ? fonts.bold : fonts.regular,
          fontWeight: title || heading || bold ? '700' : '400',
          fontSize: size,
          lineHeight: heading ? size * 1.05 : size * 1.2,
          letterSpacing: heading ? size * -0.05 : 0,
          includeFontPadding: false,
        },
        hint && { marginTop: -8 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Action({
  label,
  onPress,
  disabled,
  secondary = false,
  danger = false,
  link = false,
  icon,
  compact = false,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  link?: boolean;
  icon?: ImageSource;
  compact?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole={link ? 'link' : 'button'}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        compact &&
          width > metrics.mobileBreakpoint && { alignSelf: 'flex-start' },
        {
          minHeight: link ? undefined : metrics.controlHeight,
          paddingVertical: link ? 0 : 11.2,
          paddingHorizontal: link ? 0 : 16,
          borderWidth: link ? 0 : metrics.controlBorder,
          borderRadius: metrics.controlRadius,
          borderColor: colors.border,
          backgroundColor: link
            ? 'transparent'
            : danger
              ? colors.danger
              : secondary
                ? hovered
                  ? colors.surface
                  : colors.muted
                : hovered
                  ? colors.accentHover
                  : colors.accent,
          boxShadow: link
            ? undefined
            : hardShadow(
                colors.shadow,
                pressed ? 2 : hovered && !disabled ? 6 : 4,
              ),
          transform: link
            ? undefined
            : [
                { translateX: pressed ? 2 : hovered && !disabled ? -2 : 0 },
                { translateY: pressed ? 2 : hovered && !disabled ? -2 : 0 },
              ],
          opacity: disabled ? 0.6 : 1,
          flexDirection: 'row',
          gap: 10.4,
          alignItems: 'center',
          justifyContent: link ? 'flex-start' : 'center',
          ...(Platform.OS === 'web'
            ? {
                cursor: 'pointer',
                transitionDuration: '0.15s',
                outlineStyle: 'solid',
                outlineWidth: focused ? 3 : 0,
                outlineColor: colors.focus,
                outlineOffset: 3,
              }
            : {}),
        },
        style,
      ]}
    >
      {icon && (
        <Image
          source={icon}
          style={{ width: 20.8, height: 20.8 }}
          contentFit="contain"
          accessible={false}
        />
      )}
      <Text
        style={{
          fontFamily: fonts.bold,
          fontWeight: '900',
          fontSize: link ? 13.12 : 16,
          lineHeight: link ? 15.74 : 18.4,
          textTransform: 'uppercase',
          textDecorationLine: link ? 'underline' : 'none',
          textAlign: link ? 'left' : 'center',
          color: link
            ? hovered
              ? colors.accentHover
              : colors.accent
            : secondary && !danger
              ? colors.text
              : colors.surface,
          includeFontPadding: false,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function Eye({ visible, color }: { visible: boolean; color: string }) {
  const paths = visible
    ? '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.3 0 8.7 5.1 9.7 7.1a1.8 1.8 0 0 1 0 1.8 17.5 17.5 0 0 1-3 4"/><path d="M6.2 6.2a17.4 17.4 0 0 0-3.9 4.9 1.8 1.8 0 0 0 0 1.8C3.3 14.9 6.7 20 12 20a9.8 9.8 0 0 0 2.2-.3"/>'
    : '<path d="M2.3 12.9a1.8 1.8 0 0 1 0-1.8C3.3 9.1 6.7 4 12 4s8.7 5.1 9.7 7.1a1.8 1.8 0 0 1 0 1.8C20.7 14.9 17.3 20 12 20S3.3 14.9 2.3 12.9z"/><circle cx="12" cy="12" r="3"/>';
  return (
    <Image
      accessible={false}
      source={{
        uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`)}`,
      }}
      style={{ width: 20, height: 20 }}
    />
  );
}
export function Field({
  label,
  value,
  onChange,
  password = false,
  onSubmit,
  style,
  ...props
}: Omit<
  TextInputProps,
  'value' | 'onChange' | 'onChangeText' | 'onSubmitEditing'
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  password?: boolean;
  onSubmit?: () => void;
}) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  return (
    <View style={{ gap: 7.2 }}>
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.bold,
          fontWeight: '700',
          fontSize: 14.08,
          lineHeight: 16,
          textTransform: 'uppercase',
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChange}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.text + '80'}
          secureTextEntry={password && !visible}
          selectionColor={colors.accent}
          returnKeyType={onSubmit ? 'done' : 'next'}
          onSubmitEditing={onSubmit ? () => onSubmit() : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
          style={[
            {
              flex: 1,
              minWidth: 0,
              minHeight: metrics.controlHeight,
              paddingVertical: 10.4,
              paddingHorizontal: 12,
              borderWidth: metrics.controlBorder,
              borderRadius: metrics.controlRadius,
              borderTopRightRadius: password ? 0 : metrics.controlRadius,
              borderBottomRightRadius: password ? 0 : metrics.controlRadius,
              borderColor: colors.border,
              backgroundColor: colors.muted,
              color: colors.text,
              fontFamily: fonts.bold,
              fontWeight: '700',
              fontSize: 14.08,
              lineHeight: 16,
              includeFontPadding: false,
              ...(Platform.OS === 'web'
                ? {
                    outlineStyle: 'solid',
                    outlineColor: colors.focus,
                    outlineWidth: focused ? 3 : 0,
                    outlineOffset: 3,
                  }
                : {}),
            },
            style,
          ]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            disabled={props.editable === false}
            onPress={() => {
              setVisible(!visible);
              input.current?.focus();
            }}
            style={({ pressed }) => ({
              width: metrics.controlHeight,
              minHeight: metrics.controlHeight,
              borderWidth: metrics.controlBorder,
              borderLeftWidth: 0,
              borderColor: colors.border,
              borderTopRightRadius: metrics.controlRadius,
              borderBottomRightRadius: metrics.controlRadius,
              backgroundColor: pressed ? colors.accentHover : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: hardShadow(colors.shadow, pressed ? 2 : 4),
              transform: [
                { translateX: pressed ? 2 : 0 },
                { translateY: pressed ? 2 : 0 },
              ],
            })}
          >
            <Eye visible={visible} color={colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Feedback({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const { colors } = useTheme();
  if (!error && !message) return null;
  const color = error ? colors.danger : colors.success;
  return (
    <Text
      accessibilityRole={error ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={{
        color,
        backgroundColor: color + '1f',
        borderLeftWidth: 4,
        borderLeftColor: color,
        padding: 11.2,
        fontFamily: fonts.regular,
        fontSize: 13.6,
        lineHeight: 16.32,
      }}
    >
      {error || message}
    </Text>
  );
}
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 32,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={colors.accent} />
      <Copy>{label}</Copy>
    </View>
  );
}
export function Avatar({
  picture,
  name,
}: {
  picture: string | null | undefined;
  name: string;
}) {
  const { colors } = useTheme();
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const style = {
    width: metrics.avatarSize,
    height: metrics.avatarSize,
    borderRadius: metrics.avatarSize / 2,
    borderWidth: 2,
    borderColor: colors.border,
    flexShrink: 0,
  };
  return picture && failedPicture !== picture ? (
    <Image
      source={{ uri: picture }}
      onError={() => setFailedPicture(picture)}
      accessibilityLabel={`Foto de ${name}`}
      style={style}
      contentFit="cover"
    />
  ) : (
    <View
      style={{
        ...style,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.surface,
          fontFamily: fonts.bold,
          fontSize: 28.8,
          fontWeight: '900',
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
export function AuthLayout({
  children,
  alternatives,
}: PropsWithChildren<{ alternatives?: ReactNode }>) {
  const { width } = useWindowDimensions();
  const wide = !!alternatives && width > metrics.mobileBreakpoint;
  return (
    <Screen maxWidth={wide ? metrics.socialWidth : metrics.authWidth}>
      <Card>
        <View
          style={{
            flexDirection: wide ? 'row' : 'column',
            gap: Math.min(56, Math.max(24, width * 0.04)),
          }}
        >
          <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 16 }}>
            {children}
          </View>
          {alternatives && (
            <View
              style={{ flex: wide ? 0.8 : undefined, minWidth: wide ? 224 : 0 }}
            >
              {alternatives}
            </View>
          )}
        </View>
      </Card>
    </Screen>
  );
}
export function Section({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderTopWidth: 2,
        borderTopColor: colors.border,
        paddingTop: 16,
        gap: 16,
      }}
    >
      {children}
    </View>
  );
}
export function Columns({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        flexDirection: width > metrics.mobileBreakpoint ? 'row' : 'column',
        gap: width > metrics.mobileBreakpoint ? 32 : 20,
      }}
    >
      {children}
    </View>
  );
}
export function Actions({
  children,
  dialog = false,
}: PropsWithChildren<{ dialog?: boolean }>) {
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        flexDirection:
          width > metrics.mobileBreakpoint
            ? 'row'
            : dialog
              ? 'column-reverse'
              : 'column',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 16,
        paddingTop: dialog ? 8 : 4,
      }}
    >
      {children}
    </View>
  );
}
