/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, BackHandler, DeviceEventEmitter, Modal } from 'react-native';
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  type Track as PlayerTrack,
} from 'react-native-track-player';
import App from '../App';
import PlaybackService from '../src/services/PlaybackService';
import {
  createPlaylist,
  deletePlaylist,
  deleteTrackFromDevice,
  getPixelCover,
  getDeviceTracks,
  getEqualizerSettings,
  getPlaybackRate,
  getPlaylists,
  getRecentPlayback,
  getStoredAppearance,
  getStoredPreference,
  getStoredSession,
  getTopPlayed,
  recordPlaybackHistory,
  renamePlaylist,
  setEqualizerSettings,
  setPlaybackRate,
  setPlaylistTracks,
  setMediaVolume,
  storeAppearance,
  storeLyrics,
} from '../src/native/musicLibrary';
import type { Playlist, Track } from '../src/types/Track';

jest.mock('lucide-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  const Icon = () => ReactModule.createElement(ReactNative.View);
  return new Proxy(
    {},
    { get: (_target, name) => (name === '__esModule' ? true : Icon) },
  );
});

jest.mock(
  'react-native/Libraries/PermissionsAndroid/PermissionsAndroid',
  () => {
    const permissions = jest.requireActual(
      'react-native/Libraries/PermissionsAndroid/PermissionsAndroid',
    ).default;
    return {
      __esModule: true,
      default: {
        ...permissions,
        request: jest.fn().mockResolvedValue('granted'),
      },
    };
  },
);

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    isServiceRunning: jest.fn().mockResolvedValue(false),
    setupPlayer: jest.fn().mockResolvedValue(undefined),
    updateOptions: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    reset: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    getQueue: jest.fn().mockResolvedValue([]),
    getActiveTrackIndex: jest.fn().mockResolvedValue(undefined),
    getProgress: jest.fn().mockResolvedValue({ position: 0 }),
    getRepeatMode: jest.fn().mockResolvedValue(0),
    move: jest.fn().mockResolvedValue(undefined),
    moveTracks: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    skip: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    seekBy: jest.fn().mockResolvedValue(undefined),
    setRate: jest.fn().mockResolvedValue(undefined),
    setPlayWhenReady: jest.fn().mockResolvedValue(undefined),
    removeUpcomingTracks: jest.fn().mockResolvedValue(undefined),
    setRepeatMode: jest.fn().mockResolvedValue(undefined),
  },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop',
    SkipToNext: 'skip-to-next',
    SkipToPrevious: 'skip-to-previous',
    SeekTo: 'seek-to',
  },
  State: { Playing: 'playing', Paused: 'paused' },
  Event: {
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteStop: 'remote-stop',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteSeek: 'remote-seek',
    RemoteJumpForward: 'remote-jump-forward',
    RemoteJumpBackward: 'remote-jump-backward',
    PlaybackActiveTrackChanged: 'playback-active-track-changed',
    PlaybackProgressUpdated: 'playback-progress-updated',
    PlaybackState: 'playback-state',
    PlaybackError: 'playback-error',
  },
  RepeatMode: { Off: 0, Track: 1, Queue: 2 },
  useActiveTrack: jest.fn().mockReturnValue(undefined),
  usePlaybackState: jest.fn().mockReturnValue({ state: 'none' }),
  useProgress: () => ({ position: 0, duration: 0, buffered: 0 }),
}));

jest.mock('../src/native/musicLibrary', () => ({
  getDeviceTracks: jest.fn().mockResolvedValue([]),
  getFavoriteTrackIds: jest.fn().mockResolvedValue([]),
  clearPlaybackHistory: jest.fn().mockResolvedValue(undefined),
  getEqualizerSettings: jest.fn().mockResolvedValue({
    enabled: false,
    bandGainsDb: [0, 0, 0, 0, 0],
  }),
  getPlaybackRate: jest.fn().mockResolvedValue(1),
  setTrackFavorite: jest.fn().mockResolvedValue(undefined),
  getPlaylists: jest.fn().mockResolvedValue([]),
  getRecentPlayback: jest.fn().mockResolvedValue([]),
  getTopPlayed: jest.fn().mockResolvedValue([]),
  deleteTrackFromDevice: jest.fn().mockResolvedValue(true),
  recordPlaybackHistory: jest.fn().mockResolvedValue(undefined),
  setPlaybackRate: jest.fn().mockResolvedValue(undefined),
  setEqualizerSettings: jest.fn().mockResolvedValue(undefined),
  storeSession: jest.fn().mockResolvedValue(undefined),
  getStoredSession: jest.fn().mockResolvedValue(null),
  getStoredAppearance: jest.fn().mockResolvedValue(null),
  storeAppearance: jest.fn().mockResolvedValue(undefined),
  getMediaVolume: jest.fn().mockResolvedValue({ level: 0.2, fixed: false }),
  setMediaVolume: jest.fn().mockResolvedValue({ level: 0.9, fixed: false }),
  startVolumeUpdates: jest.fn(),
  stopVolumeUpdates: jest.fn(),
  storePreference: jest.fn().mockResolvedValue(undefined),
  getStoredPreference: jest.fn().mockResolvedValue(null),
  createPlaylist: jest.fn().mockResolvedValue({
    id: 'playlist-1',
    name: 'Para correr',
    createdAt: 1,
    trackIds: [],
  }),
  renamePlaylist: jest.fn().mockResolvedValue(undefined),
  deletePlaylist: jest.fn().mockResolvedValue(undefined),
  setPlaylistTracks: jest.fn().mockResolvedValue(undefined),
  getStoredLyrics: jest.fn().mockResolvedValue(null),
  storeLyrics: jest.fn().mockResolvedValue(undefined),
  removeStoredLyrics: jest.fn().mockResolvedValue(undefined),
  importLrcFile: jest.fn().mockResolvedValue(null),
  getPixelCover: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = jest.requireActual('react');
  return {
    SafeAreaProvider: ReactModule.Fragment,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

function makeTrack(id: string, overrides: Partial<Track> = {}): Track {
  return {
    id,
    uri: `file:///${id}.mp3`,
    title: `Tema ${id}`,
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
    folder: 'Music',
    ...overrides,
  };
}

function toQueue(tracks: Track[]): PlayerTrack[] {
  return tracks.map(track => ({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
  }));
}

let renderer: ReactTestRenderer.ReactTestRenderer;

const settle = () =>
  ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

async function renderApp(initialScreen?: 'home' | 'search' | 'library') {
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App initialScreen={initialScreen} />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await settle();
}

const byLabel = (label: string) =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
    { deep: false },
  );

const screenText = () =>
  renderer.root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => [node.props.children].flat().join(''))
    .join(' | ');

const hasLabel = (label: string) =>
  renderer.root.findAll(node => node.props.accessibilityLabel === label, {
    deep: false,
  }).length > 0;

async function press(label: string) {
  const [node] = byLabel(label);
  if (!node) {
    throw new Error(`No encontré: ${label}`);
  }
  await ReactTestRenderer.act(async () => {
    await node.props.onPress();
  });
  await settle();
}

function setActive(track: Track) {
  jest.mocked(useActiveTrack).mockReturnValue({
    id: track.id,
    url: track.uri,
    title: track.title,
  });
}

function mockLiveQueue(tracks: Track[]) {
  const queue = toQueue(tracks);
  jest.mocked(TrackPlayer.getQueue).mockImplementation(async () => queue);
  jest.mocked(TrackPlayer.getActiveTrackIndex).mockResolvedValue(0);
  jest.mocked(TrackPlayer.move).mockImplementation(async (from, to) => {
    const [moved] = queue.splice(from, 1);
    queue.splice(to, 0, moved);
  });
  jest.mocked(TrackPlayer.moveTracks).mockImplementation(async moves => {
    for (const { from, to } of moves) {
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);
    }
  });
  jest.mocked(TrackPlayer.remove).mockImplementation(async index => {
    queue.splice(index as number, 1);
  });
  return queue;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDeviceTracks).mockReset().mockResolvedValue([]);
  jest.mocked(getPlaylists).mockReset().mockResolvedValue([]);
  jest.mocked(getRecentPlayback).mockReset().mockResolvedValue([]);
  jest.mocked(getTopPlayed).mockReset().mockResolvedValue([]);
  jest.mocked(getStoredSession).mockReset().mockResolvedValue(null);
  jest.mocked(useActiveTrack).mockReset().mockReturnValue(undefined);
  jest.mocked(TrackPlayer.getQueue).mockReset().mockResolvedValue([]);
  jest.mocked(TrackPlayer.move).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.moveTracks).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.remove).mockReset().mockResolvedValue(undefined);
  jest
    .mocked(TrackPlayer.getActiveTrackIndex)
    .mockReset()
    .mockResolvedValue(undefined);
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    renderer?.unmount();
  });
});

test('shows the three tabs and the home shortcuts', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  await renderApp();

  ['Inicio', 'Buscar', 'Biblioteca', 'Favoritas', 'Más escuchadas'].forEach(
    label => expect(hasLabel(label)).toBe(true),
  );
}, 30_000);

test('explains how to continue when the library is empty', async () => {
  await renderApp();

  expect(screenText()).toContain('No encontramos música');
});

test('retries a library loading failure', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockRejectedValueOnce(new Error('Error de lectura'))
    .mockResolvedValue([makeTrack('1')]);
  await renderApp();
  expect(screenText()).toContain('Error de lectura');

  await press('Reintentar');

  expect(getDeviceTracks).toHaveBeenCalledTimes(2);
});

test('registers headset, notification and session events', async () => {
  await PlaybackService();
  const events = jest
    .mocked(TrackPlayer.addEventListener)
    .mock.calls.map(([event]) => event);

  expect(events).toEqual(
    expect.arrayContaining([
      'remote-play',
      'remote-pause',
      'remote-next',
      'remote-previous',
      'remote-seek',
      'playback-active-track-changed',
      'playback-progress-updated',
    ]),
  );
});

test('plays the whole library from the Library tab', async () => {
  const tracks = [makeTrack('2'), makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  await renderApp('library');

  await press('Reproducir 2 canciones');

  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: '1' }),
    expect.objectContaining({ id: '2' }),
  ]);
  expect(TrackPlayer.play).toHaveBeenCalled();
});

test('sorts songs from the sort sheet', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([makeTrack('1'), makeTrack('2')]);
  await renderApp('library');

  await press('Ordenar: Nombre A–Z');
  await press('Nombre Z–A');
  await press('Reproducir 2 canciones');

  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: '2' }),
    expect.objectContaining({ id: '1' }),
  ]);
});

test('plays only the selected album and keeps same-title albums apart', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([
      makeTrack('a', { album: 'Homónimo', albumId: 'x' }),
      makeTrack('b', { album: 'Homónimo', albumId: 'y' }),
    ]);
  await renderApp('library');
  await press('Álbumes');

  expect(byLabel('Abrir álbum Homónimo')).toHaveLength(2);
  await press('Abrir álbum Homónimo');
  await press('Reproducir álbum Homónimo');

  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: 'a' }),
  ]);
});

test('groups songs by folder', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([
      makeTrack('1', { folder: 'Music/Rock' }),
      makeTrack('2', { folder: 'Download' }),
    ]);
  await renderApp('library');
  await press('Carpetas');
  await press('Abrir carpeta Rock');
  await press('Reproducir Rock');

  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: '1' }),
  ]);
});

test('search groups results and ignores accents', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([
      makeTrack('1', { title: 'Canción de Ñandú', artist: 'María' }),
      makeTrack('2', { title: 'Otra', artist: 'Pedro' }),
    ]);
  await renderApp('search');
  const input = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel ===
        'Buscar canciones, artistas, álbumes o listas' &&
      typeof node.props.onChangeText === 'function',
    { deep: false },
  )[0];

  await ReactTestRenderer.act(async () => {
    input.props.onChangeText('maria');
  });
  await settle();

  expect(hasLabel('Abrir artista María')).toBe(true);
  expect(hasLabel('Reproducir Otra de Pedro')).toBe(false);
  await press('Reproducir Canción de Ñandú de María');
  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: '1' }),
  ]);
});

test('shows most played songs in their order', async () => {
  const tracks = [makeTrack('1'), makeTrack('2')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(getTopPlayed).mockResolvedValue([
    { trackId: '2', plays: 9 },
    { trackId: '1', plays: 1 },
  ]);
  await renderApp();

  await press('Más escuchadas');
  await press('Reproducir Más escuchadas');

  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: '2' }),
    expect.objectContaining({ id: '1' }),
  ]);
});

test('restores the saved queue and position without starting playback', async () => {
  const tracks = [makeTrack('1'), makeTrack('2')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(getStoredSession).mockResolvedValue(
    JSON.stringify({
      trackIds: ['1', 'borrada', '2'],
      originalTrackIds: ['1', '2'],
      index: 2,
      position: 42,
      sourceLabel: 'Biblioteca',
      shuffle: false,
      repeatMode: 2,
    }),
  );
  await renderApp();

  expect(TrackPlayer.add).toHaveBeenCalledWith([
    expect.objectContaining({ id: '1' }),
    expect.objectContaining({ id: '2' }),
  ]);
  expect(TrackPlayer.skip).toHaveBeenCalledWith(1, 42);
  expect(TrackPlayer.setPlayWhenReady).toHaveBeenCalledWith(false);
  expect(TrackPlayer.setRepeatMode).toHaveBeenCalledWith(2);
  expect(TrackPlayer.play).not.toHaveBeenCalled();
  expect(recordPlaybackHistory).not.toHaveBeenCalled();
});

test('undoes removing a song from a list', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([makeTrack('1'), makeTrack('2')]);
  jest
    .mocked(getPlaylists)
    .mockResolvedValue([
      { id: 'p1', name: 'Gym', createdAt: 1, trackIds: ['1', '2'] },
    ]);
  await renderApp('library');
  await press('Listas');
  await press('Abrir lista Gym, 2 canciones');

  await press('Quitar Tema 2 de Gym');
  expect(setPlaylistTracks).toHaveBeenLastCalledWith('p1', ['1']);

  await press('Deshacer quitar de la lista');
  expect(setPlaylistTracks).toHaveBeenLastCalledWith('p1', ['1', '2']);
});

test('keeps the live queue instead of a saved session', async () => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(TrackPlayer.getQueue).mockResolvedValue(toQueue(tracks));
  jest
    .mocked(getStoredSession)
    .mockResolvedValue(JSON.stringify({ trackIds: ['1'], index: 0 }));
  await renderApp();

  expect(TrackPlayer.add).not.toHaveBeenCalled();
});

test('ignores a damaged saved session', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  jest.mocked(getStoredSession).mockResolvedValue('{no es json');
  await renderApp();

  expect(TrackPlayer.add).not.toHaveBeenCalled();
});

test('shuffle keeps the current song and restores the order after a library refresh', async () => {
  const tracks = ['1', '2', '3'].map(id => makeTrack(id));
  jest
    .mocked(getDeviceTracks)
    .mockImplementation(async () => tracks.map(track => ({ ...track })));
  const queue = mockLiveQueue(tracks);
  setActive(tracks[0]);
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  await renderApp('library');
  await press('Abrir reproductor: Tema 1 de Artista');

  await press('Activar mezcla');
  randomSpy.mockRestore();
  expect(queue.map(item => item.id)).toEqual(['1', '3', '2']);
  expect(TrackPlayer.moveTracks).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    DeviceEventEmitter.emit('musicLibraryChanged');
  });
  await settle();
  await press('Desactivar mezcla');

  expect(queue.map(item => item.id)).toEqual(['1', '2', '3']);
});

test('starts the player with an invalid saved rate', async () => {
  jest.mocked(getPlaybackRate).mockResolvedValueOnce(3);
  await renderApp();

  expect(TrackPlayer.setRate).toHaveBeenCalledWith(1);
  expect(screenText()).not.toContain('No se pudo iniciar');
});

test('starts the player with an invalid saved equalizer', async () => {
  jest.mocked(getEqualizerSettings).mockResolvedValueOnce({
    enabled: true,
    bandGainsDb: [40, 0, 0, 0, 0],
  });
  await renderApp();

  expect(TrackPlayer.setRate).toHaveBeenCalledWith(1);
  expect(screenText()).not.toContain('No se pudo iniciar');
});

test('changes and persists the playback speed from its sheet', async () => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(TrackPlayer.getQueue).mockResolvedValue(toQueue(tracks));
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  await press('Velocidad de reproducción 1×');
  await press('1.5×');

  expect(TrackPlayer.setRate).toHaveBeenLastCalledWith(1.5);
  expect(setPlaybackRate).toHaveBeenCalledWith(1.5);
});

test('applies an equalizer preset and persists it', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  await renderApp();
  await press('Ajustes');
  await press('Ecualizador');

  await press('Usar perfil Graves');

  expect(setEqualizerSettings).toHaveBeenLastCalledWith(false, [5, 4, 0, 0, 0]);
});

test('adds a song next without replacing the queue', async () => {
  const tracks = ['1', '2', '3'].map(id => makeTrack(id));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(TrackPlayer.getQueue)
    .mockResolvedValue(toQueue(tracks.slice(0, 2)));
  jest.mocked(TrackPlayer.getActiveTrackIndex).mockResolvedValue(0);
  setActive(tracks[0]);
  await renderApp('library');

  await press('Más acciones para Tema 3');
  await press('Reproducir Tema 3 a continuación');

  expect(TrackPlayer.add).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: '3' }),
    1,
  );
  expect(TrackPlayer.reset).not.toHaveBeenCalled();
});

test('adds a song to an existing list from its menu', async () => {
  const playlist: Playlist = {
    id: 'p1',
    name: 'Gym',
    createdAt: 1,
    trackIds: ['1'],
  };
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([makeTrack('1'), makeTrack('2')]);
  jest.mocked(getPlaylists).mockResolvedValue([playlist]);
  await renderApp('library');

  await press('Más acciones para Tema 2');
  await press('Añadir Tema 2 a una lista');
  await press('Añadir a Gym');

  expect(setPlaylistTracks).toHaveBeenCalledWith('p1', ['1', '2']);
});

test('opens the album of a song from its menu', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([makeTrack('1', { album: 'Corsa', albumId: 'c' })]);
  await renderApp('library');

  await press('Más acciones para Tema 1');
  await press('Ir al álbum');

  expect(hasLabel('Reproducir álbum Corsa')).toBe(true);
});

test('refreshes the library when MediaStore reports a change', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  await renderApp();

  await ReactTestRenderer.act(async () => {
    DeviceEventEmitter.emit('musicLibraryChanged');
  });
  await settle();

  expect(getDeviceTracks).toHaveBeenCalledTimes(2);
});

test('deletes a song from the device only after confirming', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await renderApp('library');

  await press('Más acciones para Tema 1');
  await press('Eliminar Tema 1 del dispositivo');
  expect(deleteTrackFromDevice).not.toHaveBeenCalled();

  const buttons = alert.mock.calls[0][2] ?? [];
  await ReactTestRenderer.act(async () => {
    buttons.find(button => button.text === 'Eliminar')?.onPress?.();
  });
  await settle();

  expect(deleteTrackFromDevice).toHaveBeenCalledWith('1');
  alert.mockRestore();
});

test('hides device deletion for songs inside a list', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  jest
    .mocked(getPlaylists)
    .mockResolvedValue([
      { id: 'p1', name: 'Gym', createdAt: 1, trackIds: ['1'] },
    ]);
  await renderApp('library');
  await press('Listas');
  await press('Abrir lista Gym, 1 canción');

  await press('Más acciones para Tema 1');

  expect(hasLabel('Eliminar Tema 1 del dispositivo')).toBe(false);
});

test('hardware back closes a detail, then returns to Home', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  const addListener = jest.spyOn(BackHandler, 'addEventListener');
  await renderApp('library');
  await press('Álbumes');
  await press('Abrir álbum Álbum');
  expect(hasLabel('Reproducir álbum Álbum')).toBe(true);
  const back = () => {
    const calls = addListener.mock.calls;
    return (calls[calls.length - 1][1] as () => boolean)();
  };

  await ReactTestRenderer.act(async () => {
    expect(back()).toBe(true);
  });
  await settle();
  expect(hasLabel('Reproducir álbum Álbum')).toBe(false);

  await ReactTestRenderer.act(async () => {
    expect(back()).toBe(true);
  });
  await settle();
  expect(hasLabel('Ajustes')).toBe(true);
  addListener.mockRestore();
});

test('creates a list, adds songs and plays them', async () => {
  const tracks = [makeTrack('1'), makeTrack('2')];
  const created: Playlist = {
    id: 'playlist-1',
    name: 'Para correr',
    createdAt: 1,
    trackIds: [],
  };
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(createPlaylist).mockResolvedValue(created);
  await renderApp('library');
  await press('Listas');

  await press('Crear lista de reproducción');
  const nameInput = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Nombre de la lista' &&
      typeof node.props.onChangeText === 'function',
    { deep: false },
  )[0];
  await ReactTestRenderer.act(async () => {
    nameInput.props.onChangeText('Para correr');
  });
  jest.mocked(getPlaylists).mockResolvedValue([created]);
  await press('Guardar nombre de la lista');

  expect(createPlaylist).toHaveBeenCalledWith('Para correr');
  await press('Opciones de Para correr');
  await press('Añadir canciones a Para correr');
  await press('Tema 2 de Artista');
  jest
    .mocked(getPlaylists)
    .mockResolvedValue([{ ...created, trackIds: ['2'] }]);
  await press('Guardar canciones de la lista');

  expect(setPlaylistTracks).toHaveBeenCalledWith('playlist-1', ['2']);
  await press('Reproducir lista Para correr');
  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: '2' }),
  ]);
});

test('renames and deletes a list without touching its audio', async () => {
  const playlist: Playlist = {
    id: 'p1',
    name: 'Gym',
    createdAt: 1,
    trackIds: [],
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  jest.mocked(getPlaylists).mockResolvedValue([playlist]);
  await renderApp('library');
  await press('Listas');
  await press('Abrir lista Gym, 0 canciones');

  await press('Opciones de Gym');
  await press('Renombrar Gym');
  await press('Guardar nombre de la lista');
  expect(renamePlaylist).toHaveBeenCalledWith('p1', 'Gym');

  await press('Opciones de Gym');
  await press('Eliminar Gym');
  await press('Confirmar eliminación de Gym');

  expect(deletePlaylist).toHaveBeenCalledWith('p1');
  expect(deleteTrackFromDevice).not.toHaveBeenCalled();
});

test('shuffle starts from the live native queue when React state is stale', async () => {
  const tracks = ['1', '2', '3'].map(id => makeTrack(id));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  const queue = mockLiveQueue(tracks);
  setActive(tracks[0]);
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  await renderApp('library');
  await press('Abrir reproductor: Tema 1 de Artista');

  queue.splice(1, 2, queue[2], queue[1]);
  await press('Activar mezcla');
  randomSpy.mockRestore();

  expect(queue.map(item => item.id)).toEqual(['1', '2', '3']);
});

test('shuffle restores the original order when a native move fails halfway', async () => {
  const tracks = ['1', '2', '3', '4', '5'].map(id => makeTrack(id));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  const queue = mockLiveQueue(tracks);
  setActive(tracks[0]);
  jest.mocked(TrackPlayer.moveTracks).mockImplementationOnce(async moves => {
    const firstMove = moves[0];
    if (firstMove) {
      const [moved] = queue.splice(firstMove.from, 1);
      queue.splice(firstMove.to, 0, moved);
    }
    throw new Error('fallo nativo');
  });
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  await renderApp('library');
  await press('Abrir reproductor: Tema 1 de Artista');

  await press('Activar mezcla');
  randomSpy.mockRestore();

  expect(queue.map(item => item.id)).toEqual(['1', '2', '3', '4', '5']);
  expect(hasLabel('Activar mezcla')).toBe(true);
  expect(screenText()).toContain('fallo nativo');
});

test('ignores a second shuffle tap while the first native reorder is pending', async () => {
  const tracks = ['1', '2', '3', '4', '5'].map(id => makeTrack(id));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  const queue = mockLiveQueue(tracks);
  setActive(tracks[0]);
  const pendingMove: { release?: () => void } = {};
  jest.mocked(TrackPlayer.moveTracks).mockImplementationOnce(moves => {
    return new Promise(resolve => {
      pendingMove.release = () => {
        for (const { from, to } of moves) {
          const [moved] = queue.splice(from, 1);
          queue.splice(to, 0, moved);
        }
        resolve();
      };
    });
  });
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  await renderApp('library');
  await press('Abrir reproductor: Tema 1 de Artista');
  const shuffleButton = byLabel('Activar mezcla')[0];
  let firstOperation!: Promise<void>;

  await ReactTestRenderer.act(async () => {
    firstOperation = shuffleButton.props.onPress();
    await Promise.resolve();
  });
  expect(hasLabel('Desactivar mezcla')).toBe(true);
  await ReactTestRenderer.act(async () => {
    await shuffleButton.props.onPress();
  });
  pendingMove.release?.();
  await ReactTestRenderer.act(async () => {
    await firstOperation;
  });
  randomSpy.mockRestore();

  expect(queue.map(item => item.id)).toEqual(['1', '3', '4', '5', '2']);
  expect(hasLabel('Desactivar mezcla')).toBe(true);
});

test('removes a song from the queue and can undo it', async () => {
  const tracks = ['1', '2'].map(id => makeTrack(id));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  mockLiveQueue(tracks);
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');
  await press('Abrir cola de reproducción con 2 canciones');

  await press('Quitar Tema 2 de la cola');
  expect(TrackPlayer.remove).toHaveBeenCalledWith(1);

  await press('Deshacer eliminación, 3 segundos');
  expect(TrackPlayer.add).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: '2' }),
    1,
  );
});

test('closes the queue before the player in the same playback window', async () => {
  const tracks = ['1', '2'].map(id => makeTrack(id));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  mockLiveQueue(tracks);
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');
  await press('Abrir cola de reproducción con 2 canciones');

  const windows = () =>
    renderer.root.findAllByType(Modal).filter(node => node.props.visible);
  expect(windows()).toHaveLength(1);
  expect(hasLabel('Cerrar cola')).toBe(true);

  await ReactTestRenderer.act(async () => windows()[0].props.onRequestClose());
  expect(hasLabel('Cerrar cola')).toBe(false);
  expect(hasLabel('Cerrar reproductor')).toBe(true);

  await ReactTestRenderer.act(async () => windows()[0].props.onRequestClose());
  expect(windows()).toHaveLength(0);
  expect(hasLabel('Abrir reproductor: Tema 1 de Artista')).toBe(true);
});

test('picks a palette in the settings and saves it', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  await renderApp();
  await press('Ajustes');

  await press('Paleta de colores, Clásico');
  await press('Usar paleta Aurora');

  expect(storeAppearance).toHaveBeenCalledWith({
    themeId: 'estandar',
    paletteId: 'aurora',
  });
  expect(hasLabel('Paleta de colores, Aurora')).toBe(true);
});

test('shows the theme in the settings', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  await renderApp();
  await press('Ajustes');

  await press('Tema, Estándar');

  expect(hasLabel('Cerrar temas')).toBe(true);
  expect(hasLabel('Lista desplazable de temas disponibles')).toBe(true);
  expect(hasLabel('Nave espacial')).toBe(true);
});

test('opens with the saved palette', async () => {
  jest.mocked(getDeviceTracks).mockResolvedValue([makeTrack('1')]);
  jest.mocked(getStoredAppearance).mockResolvedValueOnce({
    paletteId: 'brasas',
  });
  await renderApp();
  await press('Ajustes');

  expect(hasLabel('Paleta de colores, Brasas')).toBe(true);
});

test('keeps the appearance settings out of the player', async () => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  expect(hasLabel('Abrir ecualizador')).toBe(true);
  expect(hasLabel('Paleta de colores, Clásico')).toBe(false);
});

test('previous restarts a song that is already under way', async () => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(TrackPlayer.getProgress).mockResolvedValueOnce({
    position: 40,
    duration: 180,
    buffered: 180,
  });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  await press('Canción anterior');

  expect(TrackPlayer.seekTo).toHaveBeenCalledWith(0);
  expect(TrackPlayer.skipToPrevious).not.toHaveBeenCalled();
});

test('hides short audio when the setting is on', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockResolvedValue([{ ...makeTrack('1'), duration: 12 }, makeTrack('2')]);
  jest.mocked(getStoredPreference).mockResolvedValue('true');
  await renderApp();
  await press('Ajustes');

  expect(hasLabel('Ocultar audios cortos, activado')).toBe(true);
  await press('Biblioteca');
  expect(hasLabel('Reproducir 1 canciones')).toBe(true);
  jest.mocked(getStoredPreference).mockResolvedValue(null);
});

test.each([
  ['Kawaii', 'Volumen', 'kawaii'],
  ['Brutalista', 'Cambiar la posición de la canción', 'brutalista'],
  [
    'Terminal',
    'Forma de la canción. Toca para cambiar la posición',
    'terminal',
  ],
  ['Tornamesa', 'Cambiar la posición de la canción', 'tornamesa'],
  ['Mixtape', 'Contador de cinta 0:00', 'mixtape'],
  ['Taquilla', 'Código de barras. Toca para cambiar la posición', 'taquilla'],
  [
    'Pixel',
    'Pantalla de juego con un personaje que camina mientras suena la música',
    'pixel',
  ],
  [
    'Vaporwave',
    'Atardecer vaporwave con una cuadrícula que avanza',
    'vaporwave',
  ],
  ['Manga', 'Viñeta de acción que late con la música', 'manga'],
  [
    'Nave espacial',
    'Ventana de la nave con estrellas y un planeta',
    'naveespacial',
  ],
])('the %s theme brings its own player', async (theme, part, id) => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  setActive(tracks[0]);
  await renderApp();
  await press('Ajustes');
  await press('Tema, Estándar');
  await press(theme);

  expect(storeAppearance).toHaveBeenLastCalledWith(
    expect.objectContaining({ themeId: id }),
  );
  await press('Abrir reproductor: Tema 1 de Artista');
  expect(hasLabel(part)).toBe(true);
  expect(hasLabel('Pausar') || hasLabel('Reproducir')).toBe(true);
  if (
    ![
      'kawaii',
      'brutalista',
      'terminal',
      'tornamesa',
      'mixtape',
      'taquilla',
      'pixel',
      'vaporwave',
    ].includes(id)
  ) {
    const labels = renderer.root
      .findAll(node => typeof node.props.accessibilityLabel === 'string')
      .map(node => node.props.accessibilityLabel as string);
    expect(
      labels.some(label => label.startsWith('Abrir cola de reproducción con ')),
    ).toBe(true);
    [
      'Abrir letras de Tema 1',
      'Activar mezcla',
      'Activar repetir canción',
      'Configurar temporizador de apagado',
      'Velocidad de reproducción 1×',
      'Abrir ecualizador',
      'Más acciones para Tema 1',
    ].forEach(label => expect(hasLabel(label)).toBe(true));
  }
});

test('the Kawaii dog asks for more volume when it is low', async () => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(getStoredAppearance).mockResolvedValueOnce({ themeId: 'kawaii' });
  setActive(tracks[0]);
  jest.mocked(usePlaybackState).mockReturnValue({ state: 'playing' } as never);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  await settle();
  expect(hasLabel('El perrito pide que subas el volumen')).toBe(true);
  const slider = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Volumen' &&
      typeof node.props.onAccessibilityAction === 'function',
  );
  await ReactTestRenderer.act(async () => {
    slider.props.onAccessibilityAction({
      nativeEvent: { actionName: 'increment' },
    });
  });
  expect(setMediaVolume).toHaveBeenCalledWith(expect.closeTo(0.3, 5));

  // Timer, speed, equalizer and the song menu live behind "Más opciones".
  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Ecualizador: Apagado')).toBe(true);
  jest.mocked(usePlaybackState).mockReturnValue({ state: 'none' } as never);
});

test('the Brutalista player keeps working across a song change', async () => {
  const tracks = [makeTrack('1'), makeTrack('2')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'brutalista' });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  [
    'Activar mezcla',
    'Activar repetir canción',
    'Abrir letras de Tema 1',
    'Siguiente canción',
    'Canción anterior',
  ].forEach(label => expect(hasLabel(label)).toBe(true));

  // A new song: the title types itself in and everything else stays usable.
  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);
  await settle();
  expect(screenText()).toContain('Tema 2');

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Temporizador: Apagado')).toBe(true);
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Ecualizador: Apagado')).toBe(true);
  expect(hasLabel('Más acciones de la canción: ›')).toBe(true);
});

test('the Terminal player draws a pixel cover and survives a song change', async () => {
  const tracks = [
    makeTrack('1', { artwork: 'file:///covers/1.jpg' }),
    makeTrack('2'),
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'terminal' });
  jest
    .mocked(getPixelCover)
    .mockResolvedValueOnce('file:///cache/pixel-covers/1.png');
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');
  await settle();

  expect(getPixelCover).toHaveBeenCalledWith(
    'file:///covers/1.jpg',
    64,
    expect.any(String),
    expect.any(String),
  );
  expect(
    renderer.root.findAll(
      node => node.props.source?.uri === 'file:///cache/pixel-covers/1.png',
    ).length,
  ).toBeGreaterThan(0);
  expect(hasLabel('Forma de la canción. Toca para cambiar la posición')).toBe(
    true,
  );

  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);
  expect(screenText()).toContain('reproduciendo "Tema 2"');
  // The second song has no cover, so the box says so.
  expect(screenText()).toContain('[ sin portada ]');

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Ecualizador: Apagado')).toBe(true);
});

test('the Tornamesa deck plays from START and keeps its mixer across a song change', async () => {
  const tracks = [makeTrack('1'), makeTrack('2')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'tornamesa' });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  // START · STOP is the player's only play button (the mini player's own
  // button, wrapped in Tap, stays mounted underneath).
  const name = (node: ReactTestRenderer.ReactTestInstance | null) =>
    !node || typeof node.type === 'string'
      ? node?.type
      : (node.type as { displayName?: string; name?: string }).displayName ??
        (node.type as { name?: string }).name;
  const playButtons = renderer.root.findAll(
    node =>
      ['Pausar', 'Reproducir'].includes(node.props.accessibilityLabel) &&
      name(node) === 'Pressable' &&
      name(node.parent) !== 'Tap',
  );
  expect(playButtons).toHaveLength(1);
  expect(screenText()).toContain('START · STOP');
  [
    'Activar mezcla',
    'Activar repetir canción',
    'Abrir ecualizador',
    'Velocidad de reproducción 1×',
    'Canción anterior',
    'Siguiente canción',
  ].forEach(label => expect(hasLabel(label)).toBe(true));

  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);
  expect(screenText()).toContain('Tema 2');

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Más acciones de la canción: ›')).toBe(true);
});

test('the Mixtape walkman shows the cover on the cassette and keeps working across a song change', async () => {
  const tracks = [
    makeTrack('1', { artwork: 'file:///covers/1.jpg' }),
    makeTrack('2'),
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'mixtape' });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  // The cover is taped to the cassette label.
  expect(
    renderer.root.findAll(
      node => node.props.source?.uri === 'file:///covers/1.jpg',
    ).length,
  ).toBeGreaterThan(0);
  [
    'Contador de cinta 0:00',
    'Canción anterior',
    'Reproducir',
    'Pausar',
    'Siguiente canción',
    'Activar mezcla',
    'Activar repetir canción',
  ].forEach(label => expect(hasLabel(label)).toBe(true));

  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);
  expect(screenText()).toContain('Tema 2');

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Ecualizador: Apagado')).toBe(true);
});

test('the Taquilla ticket shows the cover as its poster and keeps working across a song change', async () => {
  const tracks = [
    makeTrack('1', { artwork: 'file:///covers/1.jpg' }),
    makeTrack('2'),
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'taquilla' });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  expect(
    renderer.root.findAll(
      node => node.props.source?.uri === 'file:///covers/1.jpg',
    ).length,
  ).toBeGreaterThan(0);
  expect(screenText()).toContain('ADMITIDO');
  [
    'Código de barras. Toca para cambiar la posición',
    'Canción anterior',
    'Siguiente canción',
    'Activar mezcla',
    'Activar repetir canción',
  ].forEach(label => expect(hasLabel(label)).toBe(true));

  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);
  expect(screenText()).toContain('Tema 2');

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Más acciones de la canción: ›')).toBe(true);
});

test('the Pixel console labels every button and keeps working across a song change', async () => {
  const tracks = [
    makeTrack('1', { artwork: 'file:///covers/1.jpg' }),
    makeTrack('2'),
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(getStoredAppearance).mockResolvedValueOnce({ themeId: 'pixel' });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  // The cover is on the cartridge label.
  expect(
    renderer.root.findAll(
      node => node.props.source?.uri === 'file:///covers/1.jpg',
    ).length,
  ).toBeGreaterThan(0);
  ['COLA', 'LETRAS', 'ANT', 'SIG', 'MÁS', 'MEZCLA', 'REPETIR'].forEach(tag =>
    expect(screenText()).toContain(tag),
  );
  [
    'Pantalla de juego con un personaje que camina mientras suena la música',
    'Canción anterior',
    'Siguiente canción',
    'Activar mezcla',
    'Activar repetir canción',
  ].forEach(label => expect(hasLabel(label)).toBe(true));

  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);
  expect(screenText()).toContain('NIVEL');

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Ecualizador: Apagado')).toBe(true);
});

test('the Vaporwave player floats the cover and keeps working across a song change', async () => {
  const tracks = [
    makeTrack('1', { artwork: 'file:///covers/1.jpg' }),
    makeTrack('2'),
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'vaporwave' });
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  // The cover floats over the horizon (and shows in its reflection).
  expect(
    renderer.root.findAll(
      node => node.props.source?.uri === 'file:///covers/1.jpg',
    ).length,
  ).toBeGreaterThan(0);
  ['COLA', 'LETRAS', 'MEZCLA', 'REPETIR', 'MÁS', 'REW', 'FF'].forEach(tag =>
    expect(screenText()).toContain(tag),
  );
  [
    'Atardecer vaporwave con una cuadrícula que avanza',
    'Canción anterior',
    'Siguiente canción',
    'Activar mezcla',
    'Activar repetir canción',
    'Abrir letras de Tema 1',
  ].forEach(label => expect(hasLabel(label)).toBe(true));

  setActive(tracks[1]);
  await press('Añadir a favoritas');
  await settle();
  expect(hasLabel('Abrir letras de Tema 2')).toBe(true);

  await press('Más opciones: temporizador, velocidad, ecualizador y acciones');
  expect(hasLabel('Temporizador: Apagado')).toBe(true);
  expect(hasLabel('Velocidad: 1×')).toBe(true);
  expect(hasLabel('Ecualizador: Apagado')).toBe(true);
  await press('Velocidad: 1×');
  expect(hasLabel('Velocidad: 1×')).toBe(false);
});

test('marks favorites from the player', async () => {
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');

  await press('Añadir a favoritas');

  expect(hasLabel('Quitar de favoritas')).toBe(true);
});

test('the lyrics panel finds synced lyrics online and keeps them', async () => {
  const LRC = ['[00:00.50] Hola mundo', '[00:04.00] Segunda línea'].join('\n');
  const tracks = [makeTrack('1')];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getStoredAppearance)
    .mockResolvedValueOnce({ themeId: 'brutalista' });
  const fetchMock = jest.mocked(globalThis.fetch);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      duration: 180,
      syncedLyrics: LRC,
    }),
  } as Response);
  setActive(tracks[0]);
  await renderApp();
  await press('Abrir reproductor: Tema 1 de Artista');
  await press('Abrir letras de Tema 1');
  await settle();
  await settle();

  expect(storeLyrics).toHaveBeenCalledWith('1', LRC);
  expect(screenText()).toContain('Hola mundo');
  expect(String(fetchMock.mock.calls[0][0])).toContain('lrclib.net');
});
