import type { Playlist, Track } from '../src/types/Track';
import { buildBackup, matchBackup, readBackup } from '../src/utils/backup';

function makeTrack(id: string, title: string, artist = 'Artista'): Track {
  return {
    id,
    uri: `content://media/${id}`,
    title,
    artist,
    album: 'Álbum',
    albumId: '1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
}

const tracks = [makeTrack('1', 'Canción'), makeTrack('2', 'Otra')];
const playlists: Playlist[] = [
  { id: 'p', name: 'Gym', createdAt: 1, trackIds: ['2', 'ya-no-existe', '1'] },
];

test('saves favorites and lists by song name, in order', () => {
  const backup = buildBackup(tracks, new Set(['1']), playlists);

  expect(backup.favorites).toEqual([
    { title: 'Canción', artist: 'Artista', album: 'Álbum' },
  ]);
  expect(backup.playlists[0].tracks.map(track => track.title)).toEqual([
    'Otra',
    'Canción',
  ]);
});

test('finds the songs on a phone where their ids are different', () => {
  const backup = buildBackup(tracks, new Set(['1']), playlists);
  const otherPhone = [makeTrack('50', 'CANCION'), makeTrack('60', 'Otra')];

  const result = matchBackup(backup, otherPhone);

  expect(result.favoriteIds).toEqual(['50']);
  expect(result.playlists).toEqual([{ name: 'Gym', trackIds: ['60', '50'] }]);
  expect(result.missingCount).toBe(0);
});

test('uses album metadata to disambiguate duplicate titles and artists', () => {
  const backup = buildBackup(
    [
      { ...makeTrack('1', 'Remix'), album: 'Versiones' },
      { ...makeTrack('2', 'Remix'), album: 'Colaboraciones' },
    ],
    new Set(['2']),
    [],
  );
  const otherPhone = [
    { ...makeTrack('50', 'Remix'), album: 'Versiones' },
    { ...makeTrack('60', 'Remix'), album: 'Colaboraciones' },
  ];

  expect(matchBackup(backup, otherPhone).favoriteIds).toEqual(['60']);
});

test('does not guess when an older backup matches multiple local tracks', () => {
  const backup = {
    version: 1 as const,
    favorites: [{ title: 'Remix', artist: 'Artista' }],
    playlists: [],
  };
  const duplicates = [
    { ...makeTrack('1', 'Remix'), album: 'Versiones' },
    { ...makeTrack('2', 'Remix'), album: 'Colaboraciones' },
  ];

  const result = matchBackup(backup, duplicates);

  expect(result.favoriteIds).toEqual([]);
  expect(result.missingCount).toBe(1);
});

test('counts each song missing from this phone once', () => {
  const backup = buildBackup(tracks, new Set(['1']), playlists);

  const result = matchBackup(backup, [makeTrack('60', 'Otra')]);

  expect(result.favoriteIds).toEqual([]);
  expect(result.playlists[0].trackIds).toEqual(['60']);
  expect(result.missingCount).toBe(1);
});

test('reads a saved backup back', () => {
  const backup = buildBackup(tracks, new Set(['1']), playlists);

  expect(readBackup(JSON.stringify(backup))).toEqual(backup);
});

test.each([
  ['text that is not JSON', 'hola'],
  ['another JSON file', '{"a":1}'],
  ['an unknown version', '{"version":2,"favorites":[],"playlists":[]}'],
  [
    'a list without a name',
    '{"version":1,"favorites":[],"playlists":[{"name":" ","tracks":[]}]}',
  ],
  ['a damaged song', '{"version":1,"favorites":[{"title":1}],"playlists":[]}'],
])('rejects %s', (_name, text) => {
  expect(readBackup(text)).toBeNull();
});
