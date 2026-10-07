import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { palettes } from '@/theme';

const base = palettes.light;
const webBase = `
  :root { --rn1-surface: ${base.surface}; --rn1-accent: ${base.accent}; --rn1-focus: ${base.focus}; color-scheme: light; font-family: "Courier New", Courier, monospace; font-synthesis: none; text-rendering: optimizeLegibility; }
  body { min-width: 320px; background: ${base.background}; }
  button { -webkit-tap-highlight-color: transparent; }
  :focus-visible { outline: 3px solid var(--rn1-focus) !important; outline-offset: 3px; }
  ::selection { color: var(--rn1-surface); background: var(--rn1-accent); }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RN1</title>
        <ScrollViewStyleReset />
        <style>{webBase}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
