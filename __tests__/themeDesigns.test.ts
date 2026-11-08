// Jest runs on Node; the app's TypeScript setup has no Node types.
declare const require: (name: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');
import { dogMood } from '../src/player/skins/dogMood';
import { appThemes } from '../src/theme/themes';

const fontsDir = path.join(__dirname, '../android/app/src/main/assets/fonts');

test('there are 26 themes, and every theme after Estándar has six palettes', () => {
  expect(appThemes.map(theme => theme.id)).toEqual([
    'estandar',
    'kawaii',
    'brutalista',
    'terminal',
    'tornamesa',
    'mixtape',
    'taquilla',
    'acuario',
    'radiobulbos',
    'pixel',
    'acuarela',
    'neonbar',
    'constelacion',
    'jardin',
    'origami',
    'cyberpunk',
    'vaporwave',
    'manga',
    'steampunk',
    'naveespacial',
    'y2k',
    'western',
    'fantasiamedieval',
    'lofi',
    'terrorgotico',
    'playa',
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
    acuario: 'Arrecife',
    radiobulbos: 'Nogal y crema',
    pixel: 'Monocromo verde',
    acuarela: 'Papel blanco',
    neonbar: 'Rosa y azul',
    constelacion: 'Medianoche',
    jardin: 'Primavera',
    origami: 'Washi',
    cyberpunk: 'Amarillo eléctrico',
    vaporwave: 'Atardecer rosa',
    manga: 'Tinta clásica',
    steampunk: 'Latón',
    naveespacial: 'Puente azul',
    y2k: 'Cromo',
    western: 'Desierto',
    fantasiamedieval: 'Pergamino',
    lofi: 'Medianoche',
    terrorgotico: 'Medianoche',
    playa: 'Caribe',
  });
});

test('every font a theme names ships with the app, with its license', () => {
  const families = new Set(
    appThemes.flatMap(theme => Object.values(theme.palettes[0].design.fonts)),
  );
  families.forEach(family => {
    expect(fs.existsSync(path.join(fontsDir, `${family}.ttf`))).toBe(true);
  });
  expect(fs.readdirSync(path.join(fontsDir, 'licencias')).length).toBe(45);
});

test('the new theme palettes follow the approved names and order', () => {
  const expected = {
    acuario: ['Arrecife', 'Laguna', 'Abisal', 'Coral', 'Musgo', 'Noche marina'],
    radiobulbos: ['Nogal y crema', 'Baquelita roja', 'Verde menta', 'Marfil', 'Grafito', 'Mostaza'],
    pixel: ['Monocromo verde', 'Atardecer', 'Cartucho gris', 'Neón', 'Pastel', 'Noche'],
    acuarela: ['Papel blanco', 'Lavanda', 'Durazno', 'Salvia', 'Índigo', 'Ocre'],
    neonbar: ['Rosa y azul', 'Verde ácido', 'Rojo', 'Violeta', 'Ámbar', 'Blanco frío'],
    constelacion: ['Medianoche', 'Aurora boreal', 'Desierto', 'Violeta', 'Polar', 'Eclipse'],
    jardin: ['Primavera', 'Bonsái', 'Cactus', 'Girasol', 'Lavanda', 'Otoño'],
    origami: ['Washi', 'Kraft', 'Índigo', 'Rosa sakura', 'Tinta', 'Dorado'],
    cyberpunk: ['Amarillo eléctrico', 'Rojo sangre', 'Cian hielo', 'Rosa ácido', 'Verde matriz', 'Ocaso naranja'],
    vaporwave: ['Atardecer rosa', 'Menta y lila', 'Noche púrpura', 'Durazno', 'Océano', 'Cromo'],
    manga: ['Tinta clásica', 'Papel amarillento', 'Rojo de acción', 'Azul', 'Rosa', 'Noche'],
    steampunk: ['Latón', 'Cobre', 'Hierro', 'Bronce verde', 'Caoba', 'Plata'],
    naveespacial: ['Puente azul', 'Alerta roja', 'Marte', 'Nebulosa', 'Luna blanca', 'Verde radar'],
    y2k: ['Cromo', 'Hielo azul', 'Chicle', 'Lima', 'Holograma', 'Noche glitter'],
    western: ['Desierto', 'Saloon', 'Polvo rojo', 'Atardecer', 'Noche de luna', 'Sepia'],
    fantasiamedieval: ['Pergamino', 'Bosque élfico', 'Dragón rojo', 'Hechicero', 'Oro real', 'Cripta'],
    lofi: ['Medianoche', 'Atardecer café', 'Lluvia azul', 'Matcha', 'Rosa nube', 'Ámbar lámpara'],
    terrorgotico: ['Medianoche', 'Sangre', 'Niebla', 'Calabaza', 'Veneno', 'Hueso'],
    playa: ['Caribe', 'Atardecer', 'Arena', 'Tormenta', 'Noche de luna', 'Tropical'],
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
