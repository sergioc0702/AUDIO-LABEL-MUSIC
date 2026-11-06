import {
  defaultPlayerThemeId,
  getPlayerTheme,
  playerThemes,
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

test('an unknown saved theme falls back to the default one', () => {
  expect(getPlayerTheme('ya-no-existe').id).toBe(defaultPlayerThemeId);
  expect(getPlayerTheme(null).id).toBe(defaultPlayerThemeId);
});

test('theme ids are unique', () => {
  const ids = playerThemes.map(theme => theme.id);

  expect(new Set(ids).size).toBe(ids.length);
});

test.each(playerThemes.map(theme => [theme.name, theme] as const))(
  'the %s theme stays readable',
  (_name, theme) => {
    const { background, text, textSecondary, accent, control, onControl } =
      theme.palette;

    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(textSecondary, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(accent, background)).toBeGreaterThanOrEqual(3);
    expect(contrast(onControl, control)).toBeGreaterThanOrEqual(4.5);
  },
);

test.each(
  playerThemes
    .filter(theme =>
      ['aurora', 'waves', 'embers', 'sunset'].includes(theme.scene),
    )
    .map(theme => [theme.name, theme] as const),
)('the %s scene has the colors it draws with', (_name, theme) => {
  expect(theme.sceneColors.length).toBeGreaterThan(0);
  if (theme.scene === 'sunset') {
    expect(theme.sceneColors.length).toBeGreaterThanOrEqual(3);
  }
});
