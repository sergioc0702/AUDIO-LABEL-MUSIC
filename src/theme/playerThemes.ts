import type { AppColorRole, AppDesignTokens } from './tokens';

/** Each id must have a component in `components/player/scenes/PlayerScene`. */
export type PlayerSceneId = 'aurora';

export type PlayerSceneMotion = {
  /** Time for one slow pass of the background, in milliseconds. */
  driftMs: number;
  /** How far the background travels, from 0 (still) to 1. */
  intensity: number;
  /** Background visibility while paused, from 0 to 1. */
  restingEnergy: number;
};

export type PlayerTheme = {
  id: string;
  name: string;
  /** Replaces these app colors inside the player. Text and accent pairs must stay readable. */
  colors: Partial<Record<AppColorRole, string>>;
  scene: {
    id: PlayerSceneId;
    /** Colors of the moving light, from strongest to weakest. */
    glows: [string, string, string];
    motion: PlayerSceneMotion;
  };
};

/**
 * To add a theme, add an entry here. Everything inside the player, including
 * its sheets, takes these colors through `resolvePlayerTokens`.
 */
export const playerThemes: PlayerTheme[] = [
  {
    id: 'lima',
    name: 'Lima',
    colors: {},
    scene: {
      id: 'aurora',
      glows: ['#d6ff3d', '#7a5cff', '#2fd6a3'],
      motion: { driftMs: 9000, intensity: 1, restingEnergy: 0.4 },
    },
  },
];

export const defaultPlayerThemeId = 'lima';

export function getPlayerTheme(themeId: string): PlayerTheme {
  return (
    playerThemes.find(theme => theme.id === themeId) ??
    playerThemes.find(theme => theme.id === defaultPlayerThemeId) ??
    playerThemes[0]
  );
}

export function resolvePlayerTokens(
  base: AppDesignTokens,
  theme: PlayerTheme,
): AppDesignTokens {
  return { ...base, colors: { ...base.colors, ...theme.colors } };
}
