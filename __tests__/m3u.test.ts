import { buildM3u, parseM3u, resolveM3u } from '../src/utils/m3u';
import type { Track } from '../src/types/Track';

const track = (id: string, title: string, artist: string, filePath: string): Track => ({
  id,
  uri: `content://media/external/audio/media/${id}`,
  filePath,
  title,
  artist,
  album: 'Disco',
  albumId: 'album',
  duration: 120,
  dateAdded: 0,
  artwork: null,
});

const tracks = [
  track('1', 'Canción Uno', 'Artista Á', '/Music/Uno.mp3'),
  track('2', 'Canción Uno', 'Artista B', '/Music/Otro.mp3'),
];

test('round trips M3U8 paths, order, accents, and duplicate reporting', () => {
  const text = buildM3u([tracks[1], tracks[0], tracks[0]]);
  const result = resolveM3u(text, tracks);
  expect(result.trackIds).toEqual(['2', '1']);
  expect(result.duplicates).toHaveLength(1);
  expect(result.missing).toEqual([]);
});

test('matches metadata when a saved path is unavailable and reports malformed or missing entries', () => {
  const parsed = parseM3u(
    '#EXTM3U\n#EXTINF:bad\n#EXTINF:-1,Artista A - Cancion Uno\n/old/uno.mp3\n/removed.mp3\n#EXTINF:bad\n',
  );
  const result = resolveM3u('#EXTM3U\n#EXTINF:-1,Artista A - Cancion Uno\n/old/uno.mp3\n/removed.mp3\n#EXTINF:bad', tracks);
  expect(parsed.malformedLines).toBe(2);
  expect(result.trackIds).toEqual(['1']);
  expect(result.missing).toHaveLength(1);
  expect(result.malformedLines).toBe(1);
});

test('preserves order when paths match and keeps same-title songs distinct by artist', () => {
  const result = resolveM3u(
    '#EXTM3U\n#EXTINF:-1,Artista B - Canción Uno\n/does/not/exist.mp3\n#EXTINF:-1,Artista Á - Canción Uno\n/also/missing.mp3',
    tracks,
  );
  expect(result.trackIds).toEqual(['2', '1']);
});

test('does not guess when title-only metadata matches multiple songs', () => {
  const result = resolveM3u(
    '#EXTM3U\n#EXTINF:-1,Canción Uno\n/old/unknown.mp3',
    tracks,
  );

  expect(result.trackIds).toEqual([]);
  expect(result.missing).toHaveLength(1);
});

test('accepts unknown duration and rejects other negative EXTINF values', () => {
  const parsed = parseM3u(
    '#EXTM3U\n#EXTINF:-1,Artista Á - Canción Uno\n/Music/Uno.mp3\n' +
      '#EXTINF:-0.5,Artista B - Canción Uno\n/Music/Otro.mp3',
  );

  expect(parsed.entries).toHaveLength(2);
  expect(parsed.entries[0].durationSeconds).toBeNull();
  expect(parsed.malformedLines).toBe(1);
});
