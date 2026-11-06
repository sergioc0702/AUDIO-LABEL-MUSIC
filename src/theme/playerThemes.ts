export type PlayerSceneId =
  | 'none'
  | 'cover'
  | 'aurora'
  | 'waves'
  | 'embers'
  | 'sunset';

export type PlayerPalette = {
  background: string;
  text: string;
  textSecondary: string;
  accent: string;
  /** Fill of the main play button. */
  control: string;
  /** Icon on top of the main play button. */
  onControl: string;
  track: string;
};

export type PlayerTheme = {
  id: string;
  name: string;
  palette: PlayerPalette;
  scene: PlayerSceneId;
  /** Colors of the moving elements, from strongest to weakest. */
  sceneColors: string[];
};

/**
 * To add a theme, add an entry here. A new kind of animation also needs a
 * component in `src/player/PlayerScene.tsx`.
 */
export const playerThemes: PlayerTheme[] = [
  {
    id: 'clasico',
    name: 'Clásico',
    palette: {
      background: '#121214',
      text: '#ffffff',
      textSecondary: '#b6b6be',
      accent: '#ff7a59',
      control: '#ffffff',
      onControl: '#121214',
      track: '#3b3b43',
    },
    scene: 'none',
    sceneColors: [],
  },
  {
    id: 'portada',
    name: 'Portada',
    palette: {
      background: '#0d0d0f',
      text: '#ffffff',
      textSecondary: '#d9d9e0',
      accent: '#ffffff',
      control: '#ffffff',
      onControl: '#0d0d0f',
      track: '#5a5a63',
    },
    scene: 'cover',
    sceneColors: [],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    palette: {
      background: '#0a1020',
      text: '#f2f6ff',
      textSecondary: '#aebad8',
      accent: '#5ef2c2',
      control: '#5ef2c2',
      onControl: '#06231b',
      track: '#2c3758',
    },
    scene: 'aurora',
    sceneColors: ['#5ef2c2', '#7a5cff', '#2fa8ff'],
  },
  {
    id: 'ondas',
    name: 'Ondas',
    palette: {
      background: '#08191f',
      text: '#eafcff',
      textSecondary: '#a3c6d1',
      accent: '#4fd8ff',
      control: '#eafcff',
      onControl: '#08191f',
      track: '#254450',
    },
    scene: 'waves',
    sceneColors: ['#4fd8ff'],
  },
  {
    id: 'brasas',
    name: 'Brasas',
    palette: {
      background: '#170a07',
      text: '#fff2e8',
      textSecondary: '#d6b6a3',
      accent: '#ffb03a',
      control: '#ffb03a',
      onControl: '#2a1400',
      track: '#4b2b21',
    },
    scene: 'embers',
    sceneColors: ['#ffb03a', '#ff7a2f', '#ffd98a'],
  },
  {
    id: 'atardecer',
    name: 'Atardecer',
    palette: {
      background: '#1c0f2e',
      text: '#fff0f3',
      textSecondary: '#dcc3d2',
      accent: '#ffd166',
      control: '#ffd166',
      onControl: '#2a1640',
      track: '#4b3561',
    },
    scene: 'sunset',
    sceneColors: ['#ff5e7e', '#ff9a5a', '#ffd166'],
  },
];

export const defaultPlayerThemeId = 'clasico';

export function getPlayerTheme(themeId: string | null | undefined) {
  return (
    playerThemes.find(theme => theme.id === themeId) ??
    playerThemes.find(theme => theme.id === defaultPlayerThemeId) ??
    playerThemes[0]
  );
}
