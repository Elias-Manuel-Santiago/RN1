import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

const palettes = {
  light: { background: '#f4e7c5', surface: '#fff4d6', muted: '#ead9ad', text: '#302a24', secondary: '#675c4d', accent: '#b84a39', danger: '#b84a39', success: '#39704d', border: '#302a24' },
  dark: { background: '#171522', surface: '#29243a', muted: '#39314c', text: '#f8e7b7', secondary: '#c7b898', accent: '#ff785d', danger: '#ff785d', success: '#8fd0a5', border: '#f8e7b7' },
};
type Theme = { mode: 'light' | 'dark'; colors: typeof palettes.light; toggle: () => void };
const ThemeContext = createContext<Theme | null>(null);
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<'light' | 'dark' | null>(null);
  useEffect(() => { AsyncStorage.getItem('rn1.theme').then((value) => {
    if (value === 'light' || value === 'dark') setPreference(value);
  }).catch(() => {}); }, []);
  const mode = preference ?? (system === 'dark' ? 'dark' : 'light');
  function toggle() {
    const next = mode === 'dark' ? 'light' : 'dark';
    setPreference(next);
    void AsyncStorage.setItem('rn1.theme', next).catch(() => {});
  }
  return <ThemeContext value={{ mode, colors: palettes[mode], toggle }}>{children}</ThemeContext>;
}
export function useTheme() {
  const theme = use(ThemeContext);
  if (!theme) throw new Error('ThemeProvider is missing');
  return theme;
}
