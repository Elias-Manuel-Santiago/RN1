import { Platform } from 'react-native';

// Values from the supplied src/index.css and src/App.css (1rem = 16px).
export const palettes = {
  light: {
    background: '#f4e7c5',
    surface: '#fff4d6',
    muted: '#ead9ad',
    text: '#302a24',
    secondary: '#302a24',
    accent: '#b84a39',
    accentHover: '#96392c',
    danger: '#b84a39',
    success: '#39704d',
    border: '#302a24',
    shadow: '#302a24',
    focus: '#2468a2',
  },
  dark: {
    background: '#171522',
    surface: '#29243a',
    muted: '#39314c',
    text: '#f8e7b7',
    secondary: '#f8e7b7',
    accent: '#ff785d',
    accentHover: '#ff9b85',
    danger: '#ff785d',
    success: '#8fd0a5',
    border: '#f8e7b7',
    shadow: '#0b0910',
    focus: '#9bcaff',
  },
};
export const fonts = {
  regular:
    Platform.OS === 'web' ? '"Courier New", Courier, monospace' : 'RN1Courier',
  bold:
    Platform.OS === 'web'
      ? '"Courier New", Courier, monospace'
      : 'RN1CourierBold',
};
export const metrics = {
  authWidth: 432,
  socialWidth: 992,
  accountWidth: 1216,
  adminWidth: 1440,
  dialogWidth: 544,
  mobileBreakpoint: 700,
  smallBreakpoint: 420,
  gap: 16,
  border: 3,
  radius: 4,
  controlBorder: 2,
  controlRadius: 2,
  controlHeight: 44.8,
  avatarSize: 72,
  themeSize: 48,
};
export function pagePadding(width: number) {
  return width <= metrics.smallBreakpoint
    ? 13.6
    : Math.min(80, Math.max(20, width * 0.04));
}
export function cardPadding(width: number) {
  return width <= metrics.smallBreakpoint
    ? 21.6
    : Math.min(40, Math.max(24, width * 0.05));
}
export function titleSize(width: number) {
  return Math.min(40, Math.max(28.8, width * 0.06));
}
export function hardShadow(color: string, offset: number) {
  return `${offset}px ${offset}px 0px 0px ${color}`;
}
