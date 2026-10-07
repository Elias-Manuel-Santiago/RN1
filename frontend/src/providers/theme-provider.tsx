import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  use,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { palettes } from '@/theme';
type Theme = {
  mode: 'light' | 'dark';
  colors: typeof palettes.light;
  toggle: () => void;
};
const ThemeContext = createContext<Theme | null>(null);
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('rn1.theme')
      .then((value) => {
        if (value === 'light' || value === 'dark') setPreference(value);
      })
      .catch(() => {});
  }, []);
  const mode = preference ?? (system === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const colors = palettes[mode];
    const root = document.documentElement;
    root.style.colorScheme = mode;
    root.style.setProperty('--rn1-surface', colors.surface);
    root.style.setProperty('--rn1-accent', colors.accent);
    root.style.setProperty('--rn1-focus', colors.focus);
    document.body.style.backgroundColor = colors.background;
  }, [mode]);
  function toggle() {
    const next = mode === 'dark' ? 'light' : 'dark';
    setPreference(next);
    void AsyncStorage.setItem('rn1.theme', next).catch(() => {});
  }
  return (
    <ThemeContext value={{ mode, colors: palettes[mode], toggle }}>
      {children}
    </ThemeContext>
  );
}
export function useTheme() {
  const theme = use(ThemeContext);
  if (!theme) throw new Error('ThemeProvider is missing');
  return theme;
}
