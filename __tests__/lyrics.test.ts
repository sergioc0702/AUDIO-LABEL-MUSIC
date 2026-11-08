import { currentLyricIndex, parseLrc } from '../src/utils/lyrics';

test('parses synchronized LRC lines, multiple timestamps, and positive offsets', () => {
  const lines = parseLrc(
    '\uFEFF[ar:Artista]\r\n[offset:100]\r\n[00:01.2][00:02.35]Línea con tilde',
  );
  expect(lines).toEqual([
    { timeMs: 1300, text: 'Línea con tilde' },
    { timeMs: 2450, text: 'Línea con tilde' },
  ]);
});

test('ignores metadata and timestamps before zero and selects the current line', () => {
  const lines = parseLrc('[offset:-2000]\n[00:01.00]Antes\n[00:03.00]Ahora');
  expect(lines).toEqual([{ timeMs: 1000, text: 'Ahora' }]);
  expect(currentLyricIndex(lines, 0.9)).toBe(-1);
  expect(currentLyricIndex(lines, 1)).toBe(0);
});
