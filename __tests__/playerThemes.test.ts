import { darkDesignTokens } from '../src/theme/tokens';
import {
  defaultPlayerThemeId,
  getPlayerTheme,
  playerThemes,
  resolvePlayerTokens,
  type PlayerTheme,
} from '../src/theme/playerThemes';

function luminance(hex: string) {
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const customTheme: PlayerTheme = {
  id: 'prueba',
  name: 'Prueba',
  colors: { accent: '#ff5a5f', onAccent: '#1a0506' },
  scene: {
    id: 'aurora',
    glows: ['#ff5a5f', '#ffb347', '#7a5cff'],
    motion: { driftMs: 6000, intensity: 0.5, restingEnergy: 0.3 },
  },
};

test('a theme only replaces the colors it declares', () => {
  const tokens = resolvePlayerTokens(darkDesignTokens, customTheme);

  expect(tokens.colors.accent).toBe('#ff5a5f');
  expect(tokens.colors.background).toBe(darkDesignTokens.colors.background);
  expect(tokens.spacing).toBe(darkDesignTokens.spacing);
  expect(darkDesignTokens.colors.accent).not.toBe('#ff5a5f');
});

test('an unknown saved theme falls back to the default one', () => {
  expect(getPlayerTheme('ya-no-existe').id).toBe(defaultPlayerThemeId);
});

test('theme ids are unique', () => {
  const ids = playerThemes.map(theme => theme.id);

  expect(new Set(ids).size).toBe(ids.length);
});

test.each(playerThemes.map(theme => [theme.name, theme] as const))(
  'the %s theme keeps its text readable',
  (_name, theme) => {
    const { colors } = resolvePlayerTokens(darkDesignTokens, theme);

    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(colors.muted, colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(
      4.5,
    );
  },
);
