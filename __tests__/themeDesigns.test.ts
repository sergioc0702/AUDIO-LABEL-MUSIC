// Jest runs on Node; the app's TypeScript setup has no Node types.
declare const require: (name: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');
import {
  blockPieces,
  piecesLanded,
  rowsCompleted,
} from '../src/themes/bloques/blockPieces';
import { dogMood } from '../src/themes/kawaii/dogMood';
import { chapterKanji } from '../src/themes/manga/chapterKanji';
import {
  FIGURE_STARS,
  figureIndexFor,
  starFigures,
} from '../src/themes/constelacion/starFigures';
import { appThemes } from '../src/themes/catalog';

const fontsDir = path.join(__dirname, '../android/app/src/main/assets/fonts');

test('there are fifteen themes besides Estándar, each with six palettes', () => {
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
    'constelacion',
    'cyberpunk',
    'terror',
    'bloques',
    'poder',
  ]);
  appThemes.slice(1).forEach(theme => expect(theme.palettes).toHaveLength(6));
});

test('each theme starts on the palette Sergio chose', () => {
  const first = Object.fromEntries(
    appThemes.map(theme => [theme.id, theme.palettes[0].name]),
  );
  expect(first).toMatchObject({
    kawaii: 'Algodón',
    brutalista: 'Suizo',
    terminal: 'Ámbar',
    tornamesa: 'Nogal',
    mixtape: 'Naranja',
    taquilla: 'Taquilla rosa',
    pixel: 'Monocromo verde',
    vaporwave: 'Atardecer rosa',
    manga: 'Tinta y sello',
    naveespacial: 'Hiperespacio',
    constelacion: 'Ciruela y coral',
    cyberpunk: 'Hielo eléctrico',
    terror: 'Linterna',
    bloques: 'Noche arcade',
    poder: 'Gi naranja',
  });
});

test('every font a theme names ships with the app, with its license', () => {
  const families = new Set(
    appThemes.flatMap(theme => Object.values(theme.palettes[0].design.fonts)),
  );
  families.forEach(family => {
    expect(fs.existsSync(path.join(fontsDir, `${family}.ttf`))).toBe(true);
  });
  expect(fs.readdirSync(path.join(fontsDir, 'licencias')).length).toBe(23);
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
      'Tinta y sello',
      'Portada a color',
      'Shōjo',
      'Tomo antiguo',
      'Página negra',
      'Neón nocturno',
    ],
    naveespacial: [
      'Hiperespacio',
      'Supernova',
      'Aurora boreal',
      'Eclipse dorado',
      'Nébula rosa',
      'Estación blanca',
    ],
    constelacion: [
      'Ciruela y coral',
      'Malaquita',
      'Laca roja',
      'Bronce y turquesa',
      'Arena nocturna',
      'Nácar',
    ],
    cyberpunk: [
      'Hielo eléctrico',
      'Neón rosa',
      'Akihabara',
      'Puesto de ramen',
      'Lluvia ácida',
      'Sakura digital',
    ],
    terror: [
      'Linterna',
      'Luz de luna',
      'Sótano',
      'Hospital',
      'Luz negra',
      'Ceniza',
    ],
    bloques: ['Noche arcade', 'Menta', 'Papel', 'Uva', 'Lava', 'Hielo'],
    poder: [
      'Gi naranja',
      'Aura dorada',
      'Aura celeste',
      'Planeta esmeralda',
      'Torneo al mediodía',
      'Aura violeta',
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

test.each([
  [1, '第一話'],
  [10, '第十話'],
  [12, '第十二話'],
  [20, '第二十話'],
  [105, '第百五話'],
  [342, '第三百四十二話'],
])('the Manga chapter %s is printed as %s', (chapter, text) => {
  expect(chapterKanji(chapter)).toBe(text);
});

test('every song keeps the same star animal, and every animal can turn into another', () => {
  expect(figureIndexFor('42')).toBe(figureIndexFor('42'));
  expect(figureIndexFor(undefined)).toBe(0);
  const seen = new Set(
    Array.from({ length: 60 }, (_, n) => figureIndexFor(`song-${n}`)),
  );
  expect(seen.size).toBeGreaterThan(3);
  starFigures.forEach(figure => {
    expect(figure.a).toHaveLength(FIGURE_STARS);
    expect(figure.b).toHaveLength(FIGURE_STARS);
    figure.edges.flat().forEach(star => {
      expect(star).toBeGreaterThanOrEqual(0);
      expect(star).toBeLessThan(FIGURE_STARS);
    });
  });
});

test.each([
  ['terror', 'TerrorPlayer.tsx'],
  ['cyberpunk', 'CyberpunkPlayer.tsx'],
  ['bloques', 'BloquesPlayer.tsx'],
  ['poder', 'PoderPlayer.tsx'],
])(
  'every skin color the %s player reads exists in all of its palettes',
  (id, file) => {
    const source: string = fs.readFileSync(
      path.join(__dirname, '../src/themes', id, file),
      'utf8',
    );
    const used = new Set(
      Array.from(source.matchAll(/\bs\.([a-zA-Z0-9]+)/g), match => match[1]),
    );
    const theme = appThemes.find(item => item.id === id);
    theme?.palettes.forEach(palette => {
      used.forEach(key => {
        expect([palette.name, key, palette.skin[key]]).toEqual([
          palette.name,
          key,
          expect.any(String),
        ]);
      });
    });
  },
);

test('the Bloques pieces fill the whole board once, so the cover ends complete', () => {
  expect(blockPieces).toHaveLength(25);
  const seen = new Set<string>();
  blockPieces.forEach(piece => {
    expect(piece).toHaveLength(4);
    piece.forEach(([column, row]) => {
      expect(column).toBeGreaterThanOrEqual(0);
      expect(column).toBeLessThan(10);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(10);
      seen.add(`${column}-${row}`);
    });
  });
  expect(seen.size).toBe(100);
  // The first pieces land at the bottom.
  blockPieces[0].forEach(([, row]) => expect(row).toBeGreaterThanOrEqual(8));
  expect(piecesLanded(0)).toBe(0);
  expect(piecesLanded(0.5)).toBe(12);
  expect(piecesLanded(1)).toBe(25);
  expect(piecesLanded(2)).toBe(25);
  expect(rowsCompleted(4)).toBe(0);
  expect(rowsCompleted(5)).toBe(2);
  expect(rowsCompleted(25)).toBe(10);
});

test('the Poder reading climbs with the song and reads like 9.120', () => {
  // The player module pulls in the native track player, so the helpers are
  // checked through a light copy of their rules.
  const level = (p: number) =>
    Math.round(Math.pow(Math.min(1, Math.max(0, p)), 1.6) * 9000 + 120);
  expect(level(0)).toBe(120);
  expect(level(1)).toBe(9120);
  expect(level(0.5)).toBeLessThan(level(0.8));
  expect(String(9120).replace(/\B(?=(\d{3})+(?!\d))/g, '.')).toBe('9.120');
});
