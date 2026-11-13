// Jest runs on Node; the app's TypeScript setup has no Node types.
declare const require: (name: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');
import { dogMood } from '../src/player/skins/dogMood';
import { appThemes } from '../src/theme/themes';

const fontsDir = path.join(__dirname, '../android/app/src/main/assets/fonts');

test('there are ten themes besides Estándar, each with six palettes', () => {
  expect(appThemes.map(theme => theme.id)).toEqual([
    'estandar',
    'kawaii',
    'brutalista',
    'terminal',
    'tornamesa',
    'mixtape',
    'taquilla',
    'pixel',
    'vaporwave',
    'manga',
    'naveespacial',
  ]);
  appThemes.slice(1).forEach(theme => expect(theme.palettes).toHaveLength(6));
});

test('each theme starts on the palette Sergio chose', () => {
  const first = Object.fromEntries(
    appThemes.map(theme => [theme.id, theme.palettes[0].name]),
  );
  expect(first).toMatchObject({
    kawaii: 'Algodón',
    brutalista: 'Ácido',
    terminal: 'Ámbar',
    tornamesa: 'Nogal',
    mixtape: 'Naranja',
    taquilla: 'Taquilla rosa',
    pixel: 'Monocromo verde',
    vaporwave: 'Atardecer rosa',
    manga: 'Tinta clásica',
    naveespacial: 'Puente azul',
  });
});

test('every font a theme names ships with the app, with its license', () => {
  const families = new Set(
    appThemes.flatMap(theme => Object.values(theme.palettes[0].design.fonts)),
  );
  families.forEach(family => {
    expect(fs.existsSync(path.join(fontsDir, `${family}.ttf`))).toBe(true);
  });
  expect(fs.readdirSync(path.join(fontsDir, 'licencias')).length).toBe(16);
});

test('the new theme palettes follow the approved names and order', () => {
  const expected = {
    pixel: [
      'Monocromo verde',
      'Atardecer',
      'Cartucho gris',
      'Neón',
      'Pastel',
      'Noche',
    ],
    vaporwave: [
      'Atardecer rosa',
      'Menta y lila',
      'Noche púrpura',
      'Durazno',
      'Océano',
      'Cromo',
    ],
    manga: [
      'Tinta clásica',
      'Papel amarillento',
      'Rojo de acción',
      'Azul',
      'Rosa',
      'Noche',
    ],
    naveespacial: [
      'Puente azul',
      'Alerta roja',
      'Marte',
      'Nebulosa',
      'Luna blanca',
      'Verde radar',
    ],
  };
  Object.entries(expected).forEach(([id, names]) => {
    const theme = appThemes.find(item => item.id === id);
    expect(theme?.palettes.map(palette => palette.name)).toEqual(names);
  });
});

test('the palettes of a theme share its design', () => {
  appThemes.forEach(theme => {
    const designs = new Set(theme.palettes.map(palette => palette.design));
    expect(designs.size).toBe(1);
  });
});

test.each([
  [false, 0.9, false, 'triste'],
  [true, 0.2, false, 'ansioso'],
  [true, 0.5, false, 'tranquilo'],
  [true, 0.8, false, 'feliz'],
  [false, 0.2, true, 'feliz'],
] as const)(
  'the dog is %s playing at %s (petted: %s) → %s',
  (playing, level, petted, mood) => {
    expect(dogMood(playing, level, petted)).toBe(mood);
  },
);
