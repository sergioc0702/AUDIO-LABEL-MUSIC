import {
  findAlphabeticalTrackIndex,
  filterAndSortTracks,
  normalizeGenre,
  sortTracks,
} from '../src/utils/sortTracks';
import {
  restoreUpcomingTrackOrder,
  shuffleUpcomingTracks,
} from '../src/utils/shuffleQueue';
import type { Track } from '../src/types/Track';

const tracks: Track[] = [
  {
    id: '1',
    uri: 'file:///one.mp3',
    title: 'tema 10',
    artist: 'Luna',
    album: 'Noche',
    albumId: '1',
    duration: 180,
    dateAdded: 100,
    artwork: null,
  },
  {
    id: '2',
    uri: 'file:///two.mp3',
    title: 'Tema 2',
    artist: 'Álvaro',
    album: 'Día',
    albumId: '2',
    duration: 240,
    dateAdded: 300,
    artwork: null,
  },
];

test('sorts tracks by title naturally without mutating the library', () => {
  const sorted = sortTracks(tracks, 'titleAsc');

  expect(sorted.map(track => track.id)).toEqual(['2', '1']);
  expect(sortTracks(tracks, 'titleDesc').map(track => track.id)).toEqual([
    '1',
    '2',
  ]);
  expect(tracks.map(track => track.id)).toEqual(['1', '2']);
});

test('sorts tracks by recently added', () => {
  expect(sortTracks(tracks, 'dateAdded').map(track => track.id)).toEqual([
    '2',
    '1',
  ]);
});

test('finds alphabet positions in the currently selected title order', () => {
  const alphabetTracks = [
    { ...tracks[0], id: 'a', title: 'Álbum' },
    { ...tracks[0], id: 'c', title: 'Canción' },
    { ...tracks[0], id: 'z', title: 'Zorro' },
    { ...tracks[0], id: 'number', title: '7 días' },
  ];
  const ascending = sortTracks(alphabetTracks, 'titleAsc');
  const descending = sortTracks(alphabetTracks, 'titleDesc');

  expect(findAlphabeticalTrackIndex(ascending, 'B', 'titleAsc')).toBe(2);
  expect(findAlphabeticalTrackIndex(descending, 'B', 'titleDesc')).toBe(2);
  expect(findAlphabeticalTrackIndex(ascending, '#', 'titleAsc')).toBe(0);
  expect(findAlphabeticalTrackIndex(descending, '#', 'titleDesc')).toBe(3);
});

test('filters by available genre', () => {
  const taggedTracks = [
    { ...tracks[0], genre: 'Rock', year: 1998 },
    { ...tracks[1], genre: 'Pop', year: 2020 },
    { ...tracks[0], id: '3', genre: null, year: null },
  ];

  expect(
    filterAndSortTracks(taggedTracks, {
      query: '',
      favoritesOnly: false,
      favoriteIds: new Set(),
      sort: 'titleAsc',
      genre: 'Rock',
    }).map(track => track.id),
  ).toEqual(['1']);
});

test('normalizes known English genre labels to Spanish for display and filtering', () => {
  const taggedTracks = [{ ...tracks[0], genre: 'Alternative Rock' }];

  expect(normalizeGenre('  alternative   rock ')).toBe('Rock alternativo');
  expect(
    filterAndSortTracks(taggedTracks, {
      query: '',
      favoritesOnly: false,
      favoriteIds: new Set(),
      sort: 'titleAsc',
      genre: 'Rock alternativo',
    }),
  ).toEqual(taggedTracks);
});

test('applies favorites and sorting when the search query is empty', () => {
  const visibleTracks = filterAndSortTracks(tracks, {
    query: '',
    favoritesOnly: true,
    favoriteIds: new Set(['1']),
    sort: 'titleAsc',
  });

  expect(visibleTracks.map(track => track.id)).toEqual(['1']);
});

test('shuffles only upcoming tracks and restores their original order', () => {
  const queue = [
    tracks[0],
    tracks[1],
    { ...tracks[1], id: '3', uri: 'file:///three.mp3' },
  ];
  const shuffled = shuffleUpcomingTracks(queue, '1', () => 0);

  expect(shuffled.map(track => track.id)).toEqual(['1', '3', '2']);
  const restored = restoreUpcomingTrackOrder(shuffled, queue, '1');

  expect(restored.map(track => track.id)).toEqual(['1', '2', '3']);
});
