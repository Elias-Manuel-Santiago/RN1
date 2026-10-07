import { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { fonts, hardShadow, metrics } from '@/theme';

export function ThemeButton() {
  const { mode, colors, toggle } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const offset = width <= metrics.smallBreakpoint ? 14.4 : 20;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cambiar al tema ${mode === 'dark' ? 'claro' : 'oscuro'}`}
      testID="theme-toggle"
      onPress={toggle}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        position: 'absolute',
        right: Math.max(offset, insets.right + offset),
        bottom: Math.max(offset, insets.bottom + offset),
        zIndex: 10,
        width: metrics.themeSize,
        height: metrics.themeSize,
        borderRadius: metrics.themeSize / 2,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: hovered ? colors.accentHover : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: hardShadow(colors.shadow, pressed ? 2 : hovered ? 6 : 4),
        transform: [
          { translateX: pressed ? 2 : hovered ? -2 : 0 },
          { translateY: pressed ? 2 : hovered ? -2 : 0 },
        ],
        ...(Platform.OS === 'web'
          ? {
              transitionDuration: '0.15s',
              outlineStyle: 'solid',
              outlineColor: colors.focus,
              outlineWidth: focused ? 3 : 0,
              outlineOffset: 3,
            }
          : {}),
      })}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.bold,
          fontWeight: '900',
          fontSize: 21.6,
          includeFontPadding: false,
        }}
      >
        {mode === 'dark' ? '☀' : '☾'}
      </Text>
    </Pressable>
  );
}
