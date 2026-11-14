import { createContext, useContext } from 'react';
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { resolveAppearance } from '../themes/catalog';
import type { Palette, TextRole } from './types';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const screenPadding = spacing.lg;

type TextStyleValue = {
  color: string;
  fontSize: number;
  fontWeight?: TextStyle['fontWeight'];
  fontFamily?: string;
  textTransform?: TextStyle['textTransform'];
  lineHeight?: number;
};

const baseType: Record<
  TextRole,
  { size: number; weight?: TextStyle['fontWeight']; secondary?: boolean }
> = {
  display: { size: 30, weight: '700' },
  headline: { size: 22, weight: '700' },
  title: { size: 17, weight: '600' },
  body: { size: 15 },
  bodyStrong: { size: 15, weight: '600' },
  secondary: { size: 14, secondary: true },
  label: { size: 13, weight: '600' },
  caption: { size: 12, secondary: true },
};

/**
 * A theme's font files already carry their weight, so they get no weight of
 * their own: Android would otherwise fake a bolder version.
 */
function typeValuesFor(colors: Palette) {
  const { design } = colors;
  const entries = (Object.keys(baseType) as TextRole[]).map(role => {
    const base = baseType[role];
    const family = design.fonts[role];
    const fontSize = Math.round(base.size * (design.scale[role] ?? 1));
    const value: TextStyleValue = {
      color: base.secondary ? colors.textSecondary : colors.text,
      fontSize,
    };
    if (family) {
      value.fontFamily = family;
      value.fontWeight = 'normal';
    } else if (base.weight) {
      value.fontWeight = base.weight;
    }
    if (design.upper.includes(role)) {
      value.textTransform = 'uppercase';
    }
    if (family && fontSize >= 28) {
      // Accents and the tilde on capitals (Á, Ñ) sit above the cap height,
      // so uppercase text needs more room or Android clips them.
      const leading = value.textTransform === 'uppercase' ? 1.2 : 1.08;
      value.lineHeight = Math.round(fontSize * leading);
    }
    return [role, value] as const;
  });
  return Object.fromEntries(entries) as Record<TextRole, TextStyleValue>;
}

type TypeValues = ReturnType<typeof typeValuesFor>;

/** Bold text in the active theme: its own bold face, or the system bold. */
export function strongFont(colors: Palette): TextStyle {
  const family = colors.design.fonts.bodyStrong;
  return family
    ? { fontFamily: family, fontWeight: 'normal' }
    : { fontWeight: '700' };
}

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
