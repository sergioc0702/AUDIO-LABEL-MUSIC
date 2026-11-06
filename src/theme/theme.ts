import { StyleSheet } from 'react-native';

export const colors = {
  background: '#121214',
  surface: '#1d1d21',
  surfaceHigh: '#2b2b31',
  outline: '#3b3b43',
  text: '#ffffff',
  textSecondary: '#b6b6be',
  accent: '#ff6b7f',
  onAccent: '#23060b',
  danger: '#ff9c9c',
  scrim: '#000000b3',
  ripple: '#ffffff1f',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 6, md: 10, lg: 16, sheet: 20, full: 999 };

export const screenPadding = spacing.lg;

export const typeValues = {
  display: { color: colors.text, fontSize: 30, fontWeight: '700' as const },
  headline: { color: colors.text, fontSize: 22, fontWeight: '700' as const },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' as const },
  body: { color: colors.text, fontSize: 15 },
  bodyStrong: { color: colors.text, fontSize: 15, fontWeight: '600' as const },
  secondary: { color: colors.textSecondary, fontSize: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' as const },
  caption: { color: colors.textSecondary, fontSize: 12 },
};

export const type = StyleSheet.create(typeValues);
