// The list of themes the app offers, in the order the theme picker shows them.
// Each theme lives in its own folder: src/themes/<id>/theme.ts (design and
// palettes) next to its player. To add a theme, see AGENTS.md.
import type { AppTheme, ThemeDefinition } from '../theme/types';
import { estandarTheme } from './estandar/theme';
import { kawaiiTheme } from './kawaii/theme';
import { brutalistaTheme } from './brutalista/theme';
import { terminalTheme } from './terminal/theme';
import { tornamesaTheme } from './tornamesa/theme';
import { mixtapeTheme } from './mixtape/theme';
import { taquillaTheme } from './taquilla/theme';
import { pixelTheme } from './pixel/theme';
import { vaporwaveTheme } from './vaporwave/theme';
import { mangaTheme } from './manga/theme';
import { naveespacialTheme } from './naveespacial/theme';
import { constelacionTheme } from './constelacion/theme';
import { cyberpunkTheme } from './cyberpunk/theme';
import { terrorTheme } from './terror/theme';
import { bloquesTheme } from './bloques/theme';
import { poderTheme } from './poder/theme';

const definitions: ThemeDefinition[] = [
  estandarTheme,
  kawaiiTheme,
  brutalistaTheme,
  terminalTheme,
  tornamesaTheme,
  mixtapeTheme,
  taquillaTheme,
  pixelTheme,
  vaporwaveTheme,
  mangaTheme,
  naveespacialTheme,
  constelacionTheme,
  cyberpunkTheme,
  terrorTheme,
  bloquesTheme,
  poderTheme,
];

/** Fills in what a palette may leave out and attaches the theme design. */
const toAppTheme = ({
  design,
  palettes,
  ...theme
}: ThemeDefinition): AppTheme => ({
  ...theme,
  palettes: palettes.map(palette => ({
    scene: 'none',
    sceneColors: [],
    isLight: false,
    skin: {},
    ...palette,
    design,
  })),
});

export const appThemes: AppTheme[] = definitions.map(toAppTheme);

export const defaultAppearance = { themeId: 'estandar', paletteId: 'clasico' };

export type Appearance = typeof defaultAppearance;

/** A saved theme or palette may no longer exist: fall back to the first one. */
export function resolveAppearance(appearance: Partial<Appearance> | null) {
  const theme =
    appThemes.find(item => item.id === appearance?.themeId) ?? appThemes[0];
  const palette =
    theme.palettes.find(item => item.id === appearance?.paletteId) ??
    theme.palettes[0];
  return { theme, palette };
}
