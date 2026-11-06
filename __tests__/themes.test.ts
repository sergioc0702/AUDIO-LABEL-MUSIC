import {
  appThemes,
  defaultAppearance,
  resolveAppearance,
} from '../src/theme/themes';

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

const palettes = appThemes.flatMap(theme =>
  theme.palettes.map(palette => [theme.name, palette.name, palette] as const),
);

test('an unknown saved theme or palette falls back to the first one', () => {
  const fallback = resolveAppearance({
    themeId: 'ya-no-existe',
    paletteId: 'tampoco',
  });

  expect(fallback.theme.id).toBe(defaultAppearance.themeId);
  expect(fallback.palette.id).toBe(defaultAppearance.paletteId);
  expect(resolveAppearance(null).palette.id).toBe(defaultAppearance.paletteId);
});

test('a palette saved before themes existed is still found', () => {
  const { theme, palette } = resolveAppearance({ paletteId: 'brasas' });

  expect(theme.id).toBe('estandar');
  expect(palette.id).toBe('brasas');
});

test('theme ids are unique, and so are the palette ids of each theme', () => {
  const ids = appThemes.map(theme => theme.id);

  expect(new Set(ids).size).toBe(ids.length);
  appThemes.forEach(theme => {
    const paletteIds = theme.palettes.map(palette => palette.id);
    expect(paletteIds.length).toBeGreaterThan(0);
    expect(new Set(paletteIds).size).toBe(paletteIds.length);
  });
});

test.each(palettes)('%s: the %s palette stays readable', (_theme, _name, p) => {
  [p.background, p.navigation, p.surface, p.surfaceHigh].forEach(surface => {
    expect(contrast(p.text, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.textSecondary, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent, surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.danger, surface)).toBeGreaterThanOrEqual(4.5);
  });
  expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(p.onControl, p.control)).toBeGreaterThanOrEqual(4.5);
});

test.each(
  palettes.filter(([, , palette]) =>
    ['aurora', 'waves', 'embers', 'sunset'].includes(palette.scene),
  ),
)('%s: the %s scene has the colors it draws with', (_theme, _name, palette) => {
  expect(palette.sceneColors.length).toBeGreaterThan(0);
  if (palette.scene === 'sunset') {
    expect(palette.sceneColors.length).toBeGreaterThanOrEqual(3);
  }
});
