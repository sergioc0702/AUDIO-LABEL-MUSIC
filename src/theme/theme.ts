import { createContext, useContext } from 'react';
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { resolveAppearance, type Palette } from './themes';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 6, md: 10, lg: 16, sheet: 20, full: 999 };

export const screenPadding = spacing.lg;

function typeValuesFor(colors: Palette) {
  return {
    display: { color: colors.text, fontSize: 30, fontWeight: '700' as const },
    headline: { color: colors.text, fontSize: 22, fontWeight: '700' as const },
    title: { color: colors.text, fontSize: 17, fontWeight: '600' as const },
    body: { color: colors.text, fontSize: 15 },
    bodyStrong: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600' as const,
    },
    secondary: { color: colors.textSecondary, fontSize: 14 },
    label: { color: colors.text, fontSize: 13, fontWeight: '600' as const },
    caption: { color: colors.textSecondary, fontSize: 12 },
  };
}

type TypeValues = ReturnType<typeof typeValuesFor>;

export const ColorsContext = createContext<Palette>(
  resolveAppearance(null).palette,
);

const typeByPalette = new WeakMap<Palette, TypeValues>();

export function useColors() {
  const colors = useContext(ColorsContext);
  let type = typeByPalette.get(colors);
  if (!type) {
    type = StyleSheet.create(typeValuesFor(colors)) as TypeValues;
    typeByPalette.set(colors, type);
  }
  return { colors, type };
}

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/** Builds a hook that returns styles for the active palette, built once each. */
export function createStyles<T extends NamedStyles>(
  factory: (colors: Palette, typeValues: TypeValues) => T,
) {
  const stylesByPalette = new WeakMap<Palette, T>();

  return function useStyles(): T {
    const colors = useContext(ColorsContext);
    let styles = stylesByPalette.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors, typeValuesFor(colors))) as T;
      stylesByPalette.set(colors, styles);
    }
    return styles;
  };
}
