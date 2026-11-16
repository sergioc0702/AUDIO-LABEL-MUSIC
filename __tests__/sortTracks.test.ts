import { normalizeGenre, sortTracks } from '../src/utils/sortTracks';
import {
  buildQueueMoves,
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

test('normalizes known English genre labels to Spanish', () => {
  expect(normalizeGenre('  alternative   rock ')).toBe('Rock alternativo');
  expect(normalizeGenre('Cumbia')).toBe('Cumbia');
  expect(normalizeGenre(null)).toBe('');
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

test('builds moves from the current native order while protecting the active item', () => {
  expect(buildQueueMoves(['1', '3', '2'], ['1', '2', '3'], 1)).toEqual([
    { from: 2, to: 1 },
  ]);
});

test('rejects queue snapshots that changed during an ordering operation', () => {
  expect(() => buildQueueMoves(['1', '2'], ['1', '3'], 1)).toThrow(
    'La cola cambió mientras se reordenaba.',
  );
});
