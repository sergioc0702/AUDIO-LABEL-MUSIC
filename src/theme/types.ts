// The shapes every theme fills in. The themes themselves live in src/themes/<id>/theme.ts.

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
  | 'naveespacial'
  | 'constelacion'
  | 'cyberpunk'
  | 'terror'
  | 'bloques'
  | 'poder';

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
  home:
    | 'tiles'
    | 'pills'
    | 'rows'
    | 'listing'
    | 'keys'
    | 'tapes'
    | 'tickets'
    | 'panels'
    | 'console'
    | 'cartridges'
    | 'sunsets'
    | 'starry'
    | 'exits'
    | 'notes'
    | 'bricks'
    | 'aura';
  tabs:
    | 'pill'
    | 'blocks'
    | 'brackets'
    | 'underline'
    | 'bubbles'
    | 'hud'
    | 'cursor'
    | 'horizon'
    | 'sparkle'
    | 'neural'
    | 'flashlight'
    | 'stack'
    | 'ki';
  mini:
    | 'card'
    | 'dog'
    | 'block'
    | 'band'
    | 'vinyl'
    | 'cassette'
    | 'ticket'
    | 'panel'
    | 'cockpit'
    | 'handheld'
    | 'vhs'
    | 'starlit'
    | 'speedo'
    | 'battery'
    | 'tiles'
    | 'orb';
};

export type PaletteColors = {
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

/** A palette as a theme writes it; the catalog fills in the defaults. */
export type PaletteInput = Omit<PaletteColors, 'scene' | 'sceneColors'> &
  Partial<Pick<PaletteColors, 'scene' | 'sceneColors'>> & {
    isLight?: boolean;
    skin?: SkinColors;
  };

/** What src/themes/<id>/theme.ts exports: one theme, its design and palettes. */
export type ThemeDefinition = {
  id: PlayerStyle;
  name: string;
  description: string;
  design: ThemeDesign;
  palettes: PaletteInput[];
};
