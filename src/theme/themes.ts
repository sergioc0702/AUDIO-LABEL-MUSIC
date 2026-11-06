export type PlayerSceneId =
  | 'none'
  | 'cover'
  | 'aurora'
  | 'waves'
  | 'embers'
  | 'sunset';

/** The colors of the whole app, plus the moving background of the player. */
export type Palette = {
  id: string;
  name: string;
  background: string;
  navigation: string;
  surface: string;
  surfaceHigh: string;
  outline: string;
  text: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
  /** Fill of the main play button. */
  control: string;
  /** Icon on top of the main play button. */
  onControl: string;
  danger: string;
  scrim: string;
  ripple: string;
  scene: PlayerSceneId;
  /** Colors of the moving elements, from strongest to weakest. */
  sceneColors: string[];
};

/**
 * A theme is the design of the whole app: its look and its own set of palettes.
 * A palette only changes colors.
 */
export type AppTheme = {
  id: string;
  name: string;
  palettes: Palette[];
};

const shared = {
  danger: '#ff9c9c',
  scrim: '#000000b3',
  ripple: '#ffffff1f',
};

export const appThemes: AppTheme[] = [
  {
    id: 'estandar',
    name: 'Estándar',
    palettes: [
      {
        ...shared,
        id: 'clasico',
        name: 'Clásico',
        background: '#121214',
        navigation: '#19191c',
        surface: '#1d1d21',
        surfaceHigh: '#2b2b31',
        outline: '#3b3b43',
        text: '#ffffff',
        textSecondary: '#b6b6be',
        accent: '#ff7a59',
        onAccent: '#2a0a03',
        control: '#ffffff',
        onControl: '#121214',
        scene: 'none',
        sceneColors: [],
      },
      {
        ...shared,
        id: 'portada',
        name: 'Portada',
        background: '#0d0d0f',
        navigation: '#151518',
        surface: '#1a1a1e',
        surfaceHigh: '#28282e',
        outline: '#5a5a63',
        text: '#ffffff',
        textSecondary: '#d9d9e0',
        accent: '#ffffff',
        onAccent: '#0d0d0f',
        control: '#ffffff',
        onControl: '#0d0d0f',
        scene: 'cover',
        sceneColors: [],
      },
      {
        ...shared,
        id: 'aurora',
        name: 'Aurora',
        background: '#0a1020',
        navigation: '#0e152a',
        surface: '#131b33',
        surfaceHigh: '#1e2946',
        outline: '#2f3a5c',
        text: '#f2f6ff',
        textSecondary: '#b8c3df',
        accent: '#5ef2c2',
        onAccent: '#06231b',
        control: '#5ef2c2',
        onControl: '#06231b',
        scene: 'aurora',
        sceneColors: ['#5ef2c2', '#7a5cff', '#2fa8ff'],
      },
      {
        ...shared,
        id: 'ondas',
        name: 'Ondas',
        background: '#08191f',
        navigation: '#0c2129',
        surface: '#102932',
        surfaceHigh: '#1a3843',
        outline: '#274754',
        text: '#eafcff',
        textSecondary: '#b0d2dc',
        accent: '#4fd8ff',
        onAccent: '#04202b',
        control: '#eafcff',
        onControl: '#08191f',
        scene: 'waves',
        sceneColors: ['#4fd8ff'],
      },
      {
        ...shared,
        id: 'brasas',
        name: 'Brasas',
        background: '#170a07',
        navigation: '#20100b',
        surface: '#28140e',
        surfaceHigh: '#3a2018',
        outline: '#4f2e23',
        text: '#fff2e8',
        textSecondary: '#dfc2b0',
        accent: '#ffb03a',
        onAccent: '#2a1400',
        control: '#ffb03a',
        onControl: '#2a1400',
        scene: 'embers',
        sceneColors: ['#ffb03a', '#ff7a2f', '#ffd98a'],
      },
      {
        ...shared,
        id: 'atardecer',
        name: 'Atardecer',
        background: '#1c0f2e',
        navigation: '#241538',
        surface: '#2b1b41',
        surfaceHigh: '#3b2754',
        outline: '#4f3866',
        text: '#fff0f3',
        textSecondary: '#e0c9d7',
        accent: '#ffd166',
        onAccent: '#2a1640',
        control: '#ffd166',
        onControl: '#2a1640',
        scene: 'sunset',
        sceneColors: ['#ff5e7e', '#ff9a5a', '#ffd166'],
      },
    ],
  },
];

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
