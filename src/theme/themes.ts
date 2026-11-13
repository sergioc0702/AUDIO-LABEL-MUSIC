import { themePalettes } from './themePalettes';

export type PlayerSceneId =
  | 'none'
  | 'cover'
  | 'aurora'
  | 'waves'
  | 'embers'
  | 'sunset';

export type PlayerStyle =
  | 'estandar'
  | 'kawaii'
  | 'brutalista'
  | 'terminal'
  | 'tornamesa'
  | 'mixtape'
  | 'taquilla'
  | 'pixel'
  | 'vaporwave'
  | 'manga'
  | 'naveespacial';

/** Extra colors that only one theme's own pieces use. */
export type SkinColors = Record<string, string>;

export type TextRole =
  | 'display'
  | 'headline'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'secondary'
  | 'label'
  | 'caption';

/** Everything a theme changes besides colors. */
export type ThemeDesign = {
  player: PlayerStyle;
  /** Font file per text role; missing roles use the system font. */
  fonts: Partial<Record<TextRole, string>>;
  /** Size multiplier per text role, for faces that run small or large. */
  scale: Partial<Record<TextRole, number>>;
  upper: TextRole[];
  radius: { sm: number; md: number; lg: number; sheet: number; full: number };
  /** Border width of blocks, 0 for none. */
  line: number;
  home: 'tiles' | 'pills' | 'rows' | 'listing' | 'keys' | 'tapes' | 'tickets';
  tabs: 'pill' | 'blocks' | 'brackets' | 'underline';
  mini: 'card' | 'dog' | 'block' | 'band' | 'vinyl' | 'cassette' | 'ticket';
};

type PaletteColors = {
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

/** The colors of the whole app, plus the design of the theme they belong to. */
export type Palette = PaletteColors & {
  /** Light backgrounds need dark status bar icons. */
  isLight: boolean;
  skin: SkinColors;
  design: ThemeDesign;
};

/**
 * A theme is the design of the whole app: its look and its own set of palettes.
 * A palette only changes colors.
 */
export type AppTheme = {
  id: string;
  name: string;
  description: string;
  palettes: Palette[];
};

const baseRadius = { sm: 6, md: 10, lg: 16, sheet: 20, full: 999 };

const fontSet = (display: string, body = display) => ({
  display,
  headline: display,
  title: body,
  body,
  bodyStrong: body,
  secondary: body,
  label: body,
  caption: body,
});

const themedDesign = (
  player: PlayerStyle,
  display: string,
  body: string,
  options: Partial<ThemeDesign> = {},
): ThemeDesign => ({
  player,
  fonts: fontSet(display, body),
  scale: {},
  upper: [],
  radius: baseRadius,
  line: 0,
  home: 'tiles',
  tabs: 'pill',
  mini: 'card',
  ...options,
});

const designs: Record<PlayerStyle, ThemeDesign> = {
  estandar: {
    player: 'estandar',
    fonts: {},
    scale: {},
    upper: [],
    radius: baseRadius,
    line: 0,
    home: 'tiles',
    tabs: 'pill',
    mini: 'card',
  },
  kawaii: {
    player: 'kawaii',
    fonts: {
      display: 'Fredoka-Bold',
      headline: 'Fredoka-Bold',
      title: 'Fredoka-SemiBold',
      body: 'Fredoka-Medium',
      bodyStrong: 'Fredoka-SemiBold',
      secondary: 'Fredoka-Medium',
      label: 'Fredoka-SemiBold',
      caption: 'Fredoka-Medium',
    },
    scale: {},
    upper: [],
    radius: { sm: 14, md: 20, lg: 26, sheet: 32, full: 999 },
    line: 0,
    home: 'pills',
    tabs: 'pill',
    mini: 'dog',
  },
  brutalista: {
    player: 'brutalista',
    fonts: {
      display: 'Anton-Regular',
      headline: 'Anton-Regular',
      title: 'Archivo-ExtraBold',
      body: 'Archivo-SemiBold',
      bodyStrong: 'Archivo-ExtraBold',
      secondary: 'Archivo-SemiBold',
      label: 'Archivo-ExtraBold',
      caption: 'Archivo-SemiBold',
    },
    scale: { display: 1.6, headline: 1.35 },
    upper: ['display', 'headline', 'label'],
    radius: { sm: 0, md: 0, lg: 0, sheet: 0, full: 0 },
    line: 3,
    home: 'rows',
    tabs: 'blocks',
    mini: 'block',
  },
  terminal: {
    player: 'terminal',
    fonts: {
      display: 'JetBrainsMono-Bold',
      headline: 'JetBrainsMono-Bold',
      title: 'JetBrainsMono-Bold',
      body: 'JetBrainsMono-Regular',
      bodyStrong: 'JetBrainsMono-Bold',
      secondary: 'JetBrainsMono-Regular',
      label: 'JetBrainsMono-Bold',
      caption: 'JetBrainsMono-Regular',
    },
    scale: { display: 0.8, headline: 0.85, body: 0.93, bodyStrong: 0.93 },
    upper: [],
    radius: { sm: 0, md: 0, lg: 0, sheet: 0, full: 0 },
    line: 1,
    home: 'listing',
    tabs: 'brackets',
    mini: 'band',
  },
  tornamesa: {
    player: 'tornamesa',
    fonts: {
      display: 'BricolageGrotesque-Bold',
      headline: 'BricolageGrotesque-Bold',
      title: 'BricolageGrotesque-Bold',
      body: 'BricolageGrotesque-Medium',
      bodyStrong: 'BricolageGrotesque-Bold',
      secondary: 'BricolageGrotesque-Medium',
      label: 'BricolageGrotesque-Bold',
      caption: 'BricolageGrotesque-Medium',
    },
    scale: {},
    upper: [],
    radius: { sm: 6, md: 8, lg: 10, sheet: 18, full: 999 },
    line: 0,
    home: 'keys',
    tabs: 'underline',
    mini: 'vinyl',
  },
  mixtape: {
    player: 'mixtape',
    fonts: {
      display: 'ReenieBeanie-Regular',
      headline: 'ReenieBeanie-Regular',
      title: 'BarlowCondensed-Bold',
      body: 'BarlowCondensed-Medium',
      bodyStrong: 'BarlowCondensed-SemiBold',
      secondary: 'BarlowCondensed-Medium',
      label: 'BarlowCondensed-SemiBold',
      caption: 'BarlowCondensed-Medium',
    },
    scale: {
      display: 1.7,
      headline: 1.6,
      title: 1.1,
      body: 1.12,
      bodyStrong: 1.12,
      secondary: 1.12,
      label: 1.12,
      caption: 1.1,
    },
    upper: [],
    radius: { sm: 4, md: 6, lg: 10, sheet: 14, full: 999 },
    line: 0,
    home: 'tapes',
    tabs: 'underline',
    mini: 'cassette',
  },
  taquilla: {
    player: 'taquilla',
    fonts: {
      display: 'AlfaSlabOne-Regular',
      headline: 'AlfaSlabOne-Regular',
      title: 'AlfaSlabOne-Regular',
      body: 'CourierPrime-Regular',
      bodyStrong: 'CourierPrime-Bold',
      secondary: 'CourierPrime-Regular',
      label: 'CourierPrime-Bold',
      caption: 'CourierPrime-Regular',
    },
    scale: { display: 0.95 },
    upper: ['display', 'headline'],
    radius: { sm: 6, md: 8, lg: 10, sheet: 16, full: 999 },
    line: 0,
    home: 'tickets',
    tabs: 'underline',
    mini: 'ticket',
  },
  pixel: themedDesign('pixel', 'PressStart2P-Regular', 'VT323-Regular', {
    scale: {
      display: 0.58,
      headline: 0.62,
      title: 0.82,
      body: 1.2,
      bodyStrong: 1.2,
      secondary: 1.2,
      label: 1.05,
      caption: 1.1,
    },
    radius: { sm: 0, md: 0, lg: 0, sheet: 0, full: 0 },
    line: 2,
    home: 'keys',
    tabs: 'blocks',
    mini: 'block',
  }),
  vaporwave: themedDesign('vaporwave', 'SpaceGrotesk', 'VT323-Regular', {
    scale: { body: 1.12, bodyStrong: 1.12, secondary: 1.12, caption: 1.1 },
    radius: { sm: 6, md: 10, lg: 16, sheet: 22, full: 999 },
    home: 'keys',
    tabs: 'underline',
    mini: 'cassette',
  }),
  manga: themedDesign('manga', 'Bangers-Regular', 'ComicNeue-Regular', {
    radius: { sm: 2, md: 4, lg: 8, sheet: 12, full: 999 },
    line: 2,
    home: 'tiles',
    tabs: 'blocks',
  }),
  naveespacial: themedDesign('naveespacial', 'Orbitron', 'Exo2', {
    scale: { display: 0.82, headline: 0.86 },
    radius: { sm: 4, md: 8, lg: 12, sheet: 18, full: 999 },
    line: 1,
    home: 'listing',
    tabs: 'blocks',
    mini: 'band',
  }),
};

const designed = (design: ThemeDesign, palettes: PaletteColors[]): Palette[] =>
  palettes.map(palette => ({ isLight: false, skin: {}, ...palette, design }));

const newTheme = (
  id: Exclude<PlayerStyle, 'estandar'>,
  name: string,
  description: string,
): AppTheme => ({
  id,
  name,
  description,
  palettes: themePalettes[id].map(palette => ({
    ...palette,
    scene: 'none',
    sceneColors: [],
    design: designs[id],
  })),
});

const shared = {
  danger: '#ff9c9c',
  scrim: '#000000b3',
  ripple: '#ffffff1f',
};

export const appThemes: AppTheme[] = [
  {
    id: 'estandar',
    name: 'Estándar',
    description: 'El reproductor clásico, con escenas animadas',
    palettes: designed(designs.estandar, [
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
    ]),
  },
  newTheme('kawaii', 'Kawaii', 'Un shih tzu que reacciona a la música'),
  newTheme('brutalista', 'Brutalista', 'Bloques, letras enormes y golpes'),
  newTheme('terminal', 'Terminal', 'Una consola que escribe cada acción'),
  newTheme('tornamesa', 'Tornamesa', 'Un tocadiscos con aguja y medidor'),
  newTheme('mixtape', 'Mixtape', 'Un casete que rebobina'),
  newTheme('taquilla', 'Taquilla', 'Cada canción es una boleta'),
  newTheme('pixel', 'Pixel', 'Un mundo de píxeles que avanza con cada canción'),
  newTheme('vaporwave', 'Vaporwave', 'Un atardecer retro en movimiento'),
  newTheme('manga', 'Manga', 'Viñetas y acción al ritmo de tu música'),
  newTheme(
    'naveespacial',
    'Nave espacial',
    'Una cabina que viaja entre canciones',
  ),
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
