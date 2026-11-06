/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, BackHandler, DeviceEventEmitter, Text } from 'react-native';
import TrackPlayer, {
  RepeatMode,
  useActiveTrack,
  type Track as PlayerTrack,
} from 'react-native-track-player';
import App from '../App';
import { AlphabetScrubber } from '../src/components/library/LibraryComponents';
import PlaybackService from '../src/services/PlaybackService';
import {
  createPlaylist,
  deletePlaylist,
  deleteTrackFromDevice,
  getDeviceTracks,
  getEqualizerSettings,
  getPlaybackRate,
  getPlaylists,
  getRecentPlayback,
  recordPlaybackHistory,
  renamePlaylist,
  setEqualizerSettings,
  setPlaybackRate,
  setPlaylistTracks,
} from '../src/native/musicLibrary';
import type { Playlist, Track } from '../src/types/Track';

jest.mock('lucide-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  const Icon = () => ReactModule.createElement(ReactNative.View);
  return {
    Album: Icon,
    Check: Icon,
    ChevronDown: Icon,
    ChevronLeft: Icon,
    ChevronRight: Icon,
    Clock3: Icon,
    Gauge: Icon,
    GripVertical: Icon,
    Heart: Icon,
    Home: Icon,
    ListMusic: Icon,
    Minus: Icon,
    MoreVertical: Icon,
    Music2: Icon,
    Pause: Icon,
    Play: Icon,
    Plus: Icon,
    RefreshCw: Icon,
    Repeat: Icon,
    Repeat1: Icon,
    Search: Icon,
    Shuffle: Icon,
    SkipBack: Icon,
    SkipForward: Icon,
    SlidersHorizontal: Icon,
    X: Icon,
  };
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
    getRepeatMode: jest.fn().mockResolvedValue(0),
    move: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    skip: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    seekBy: jest.fn().mockResolvedValue(undefined),
    setRate: jest.fn().mockResolvedValue(undefined),
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
  State: { Playing: 'playing' },
  Event: {
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteStop: 'remote-stop',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteSeek: 'remote-seek',
    RemoteJumpForward: 'remote-jump-forward',
    RemoteJumpBackward: 'remote-jump-backward',
  },
  RepeatMode: { Off: 0, Track: 1, Queue: 2 },
  useActiveTrack: jest.fn().mockReturnValue(undefined),
  usePlaybackState: () => ({ state: 'none' }),
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
  deleteTrackFromDevice: jest.fn().mockResolvedValue(true),
  recordPlaybackHistory: jest.fn().mockResolvedValue(undefined),
  setPlaybackRate: jest.fn().mockResolvedValue(undefined),
  setEqualizerSettings: jest.fn().mockResolvedValue(undefined),
  createPlaylist: jest.fn().mockResolvedValue({
    id: 'playlist-1',
    name: 'Favoritas para correr',
    createdAt: 1,
    trackIds: [],
  }),
  renamePlaylist: jest.fn().mockResolvedValue(undefined),
  deletePlaylist: jest.fn().mockResolvedValue(undefined),
  setPlaylistTracks: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    SafeAreaProvider: ReactModule.Fragment,
    SafeAreaView: ReactNative.View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDeviceTracks).mockReset().mockResolvedValue([]);
  jest.mocked(getPlaylists).mockReset().mockResolvedValue([]);
  jest.mocked(getRecentPlayback).mockReset().mockResolvedValue([]);
  jest.mocked(useActiveTrack).mockReset().mockReturnValue(undefined);
  jest.mocked(TrackPlayer.add).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.move).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.pause).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.play).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.reset).mockReset().mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.getQueue).mockReset().mockResolvedValue([]);
  jest
    .mocked(TrackPlayer.getActiveTrackIndex)
    .mockReset()
    .mockResolvedValue(undefined);
  jest.mocked(TrackPlayer.getRepeatMode).mockReset().mockResolvedValue(0);
});

function findPlayerOpenButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith('Abrir reproductor:'),
  );
}

function createLibraryApp() {
  return ReactTestRenderer.create(<App initialScreen="library" />);
}

test('captures alphabet scrubbing and skips repeated letters', () => {
  const onSelect = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AlphabetScrubber height={270} onSelect={onSelect} />,
    );
  });
  const scrubber = renderer!.root.findByProps({
    accessibilityLabel: 'Índice alfabético de canciones',
  });

  expect(scrubber.props.onResponderTerminationRequest()).toBe(false);
  expect(
    scrubber.props.onStartShouldSetResponderCapture({
      nativeEvent: { touches: [] },
      touchHistory: { numberActiveTouches: 0 },
    } as never),
  ).toBe(true);
  const responderEventAt = (pageY: number, timeStamp: number) =>
    ({
      nativeEvent: { pageY, touches: [] },
      touchHistory: {
        numberActiveTouches: 1,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: timeStamp,
        touchBank: [
          {
            touchActive: true,
            currentTimeStamp: timeStamp,
            currentPageX: 0,
            currentPageY: pageY,
            previousPageX: 0,
            previousPageY: pageY - 1,
          },
        ],
      },
    } as never);
  ReactTestRenderer.act(() => {
    scrubber.props.onResponderGrant(responderEventAt(1, 1));
    scrubber.props.onResponderMove(responderEventAt(2, 2));
    scrubber.props.onResponderMove(responderEventAt(25, 3));
  });

  expect(onSelect.mock.calls.map(([letter]) => letter)).toEqual(['#', 'B']);
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('orders the alphabet index in the same direction as the song list', () => {
  const onSelect = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AlphabetScrubber descending height={270} onSelect={onSelect} />,
    );
  });
  const scrubber = renderer!.root.findByProps({
    accessibilityLabel: 'Índice alfabético de canciones',
  });

  expect(
    scrubber
      .findAll(node => node.type === Text)
      .map(node => node.props.children),
  ).toEqual([...'ZYXWVUTSRQPONMLKJIHGFEDCBA#']);
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(renderer!.root.findByProps({ children: 'Tu música' })).toBeTruthy();
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Inicio' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Buscar' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Buscar canciones, artistas o álbumes',
    }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Biblioteca' })
      .props.onPress();
  });
  expect(
    renderer!.root.findAllByProps({ children: 'Canciones' }).length,
  ).toBeGreaterThan(0);
  expect(renderer!.root.findByProps({ children: 'Favoritas' })).toBeTruthy();
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Reproducir 0 canciones',
    }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Reproducir aleatoriamente 0 canciones',
    }),
  ).toBeTruthy();
  expect(
    renderer!.root.findAllByProps({ children: 'Reproducir' }),
  ).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ children: 'Aleatorio' })).toHaveLength(
    0,
  );
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Filtrar por género' }),
  ).toBeTruthy();
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Buscar' })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Buscar canciones, artistas o álbumes',
    }),
  ).toBeTruthy();
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Biblioteca' })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Biblioteca' }),
  ).toBeTruthy();
}, 30_000);

test('retries a library loading failure with the library loader', async () => {
  jest
    .mocked(getDeviceTracks)
    .mockRejectedValueOnce(new Error('falló el escaneo'))
    .mockResolvedValueOnce([]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer!.root.findByProps({ children: 'falló el escaneo' }),
  ).toBeTruthy();
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .find(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function' &&
          node.findAll(child => child.props.children === 'Reintentar').length >
            0,
      )
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(getDeviceTracks).toHaveBeenCalledTimes(2);
  expect(
    renderer!.root.findAllByProps({ children: 'Reintentar' }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('does not show the alphabet column in Library or Search', async () => {
  const tracks: Track[] = Array.from({ length: 14 }, (_, index) => ({
    id: `song-${index}`,
    uri: `file:///song-${index}.mp3`,
    title: `Canción ${String.fromCharCode(65 + index)}`,
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: index,
    artwork: null,
  }));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  const songList = renderer!.root.find(
    node =>
      Array.isArray(node.props.data) &&
      node.props.data.some((track: Track) => track.id === 'song-0'),
  );
  const contentStyles = Array.isArray(songList.props.contentContainerStyle)
    ? songList.props.contentContainerStyle
    : [songList.props.contentContainerStyle];
  expect(
    contentStyles.some(
      (style: unknown) =>
        typeof style === 'object' &&
        style !== null &&
        'paddingRight' in style &&
        style.paddingRight === 40,
    ),
  ).toBe(false);
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Índice alfabético de canciones',
    }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Buscar' })
      .props.onPress();
  });
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Índice alfabético de canciones',
    }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('registers headset and notification transport controls', async () => {
  await PlaybackService();

  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-play',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-pause',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-stop',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-next',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-previous',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-seek',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-jump-forward',
    expect.any(Function),
  );
  expect(TrackPlayer.addEventListener).toHaveBeenCalledWith(
    'remote-jump-backward',
    expect.any(Function),
  );
});

test('opens the genre filter without year, artist or duration options', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Filtrar por género' })
      .props.onPress();
  });

  expect(renderer!.root.findByProps({ children: 'Género' })).toBeTruthy();
  expect(
    renderer!.root.findByProps({ children: 'Género musical' }),
  ).toBeTruthy();
  expect(renderer!.root.findAllByProps({ children: 'Año' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ children: 'Duración' })).toHaveLength(
    0,
  );
  expect(
    renderer!.root.findAllByProps({ children: 'Ordenar canciones' }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('cycles the library sort without opening a menu', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  const sortButton = () =>
    renderer!.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Cambiar orden de canciones:'),
    );

  expect(sortButton().props.accessibilityLabel).toBe(
    'Cambiar orden de canciones: Nombre A–Z',
  );
  await ReactTestRenderer.act(() => sortButton().props.onPress());
  expect(sortButton().props.accessibilityLabel).toBe(
    'Cambiar orden de canciones: Nombre Z–A',
  );
  await ReactTestRenderer.act(() => sortButton().props.onPress());
  expect(sortButton().props.accessibilityLabel).toBe(
    'Cambiar orden de canciones: Añadidas',
  );
  await ReactTestRenderer.act(() => sortButton().props.onPress());
  expect(sortButton().props.accessibilityLabel).toBe(
    'Cambiar orden de canciones: Nombre A–Z',
  );
  expect(
    renderer!.root.findAllByProps({ children: 'Ordenar canciones' }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('shows recently played tracks in playback order', async () => {
  const tracks: Track[] = [
    {
      id: 'song-recent',
      uri: 'file:///recent.mp3',
      title: 'Reproducida',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getRecentPlayback)
    .mockResolvedValue([{ trackId: 'song-recent', playedAt: 10 }]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Recientes' })
      .props.onPress();
  });

  expect(renderer!.root.findByProps({ children: 'Reproducida' })).toBeTruthy();
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('restores repeat mode from the active playback service', async () => {
  const track: Track = {
    id: 'song-repeat',
    uri: 'file:///repeat.mp3',
    title: 'Repetición',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([track]);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
  } satisfies PlayerTrack);
  jest.mocked(TrackPlayer.getRepeatMode).mockResolvedValue(RepeatMode.Queue);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    findPlayerOpenButton(renderer!).props.onPress();
  });

  expect(TrackPlayer.getRepeatMode).toHaveBeenCalled();
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Desactivar repetición',
    }).props.accessibilityState.selected,
  ).toBe(true);

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('records playback and changes the persisted playback speed', async () => {
  const track: Track = {
    id: 'song-speed',
    uri: 'file:///speed.mp3',
    title: 'Velocidad',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([track]);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
  } satisfies PlayerTrack);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(recordPlaybackHistory).toHaveBeenCalledWith(track.id);

  await ReactTestRenderer.act(() => {
    findPlayerOpenButton(renderer!).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Velocidad de reproducción 1×' })
      .props.onPress();
    await Promise.resolve();
  });
  expect(TrackPlayer.setRate).toHaveBeenLastCalledWith(1.25);
  expect(setPlaybackRate).toHaveBeenCalledWith(1.25);
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('opens the software equalizer and persists its enabled state', async () => {
  const track: Track = {
    id: 'song-equalizer',
    uri: 'file:///equalizer.mp3',
    title: 'Ecualizador',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([track]);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
  } satisfies PlayerTrack);
  jest.mocked(getEqualizerSettings).mockResolvedValue({
    enabled: false,
    bandGainsDb: [0, 0, 0, 0, 0],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    findPlayerOpenButton(renderer!).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Abrir ecualizador' })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({
      children: 'Ajuste de sonido integrado al reproductor',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Activar ecualizador' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(setEqualizerSettings).toHaveBeenLastCalledWith(true, [0, 0, 0, 0, 0]);
  const firstBand = renderer!.root.findByProps({
    accessibilityLabel: 'Graves, 60 Hz',
  });
  expect(firstBand).toBeTruthy();
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Usar perfil Graves' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(setEqualizerSettings).toHaveBeenLastCalledWith(true, [5, 4, 0, 0, 0]);
  await ReactTestRenderer.act(async () => {
    firstBand.props.onAccessibilityAction({
      nativeEvent: { actionName: 'increment' },
    });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(setEqualizerSettings).toHaveBeenLastCalledWith(true, [6, 4, 0, 0, 0]);
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('reorders playlist tracks and saves the order', async () => {
  const tracks: Track[] = [
    {
      id: 'song-a',
      uri: 'file:///a.mp3',
      title: 'Tema A',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
    {
      id: 'song-b',
      uri: 'file:///b.mp3',
      title: 'Tema B',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 2,
      artwork: null,
    },
  ];
  const playlist: Playlist = {
    id: 'playlist-order',
    name: 'Ordenada',
    createdAt: 1,
    trackIds: ['song-a', 'song-b'],
  };
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(getPlaylists).mockResolvedValue([playlist]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Listas' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Abrir lista Ordenada, 2 canciones' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    const dragHandle = renderer!.root.findByProps({
      accessibilityLabel: 'Arrastrar Tema B para reordenar',
    });
    dragHandle.props.onAccessibilityAction({
      nativeEvent: { actionName: 'decrement' },
    });
    await Promise.resolve();
  });

  expect(setPlaylistTracks).toHaveBeenCalledWith('playlist-order', [
    'song-b',
    'song-a',
  ]);
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('saves the current playback queue as an ordered playlist', async () => {
  const tracks: Track[] = [
    {
      id: 'queue-a',
      uri: 'file:///queue-a.mp3',
      title: 'Cola A',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
    {
      id: 'queue-b',
      uri: 'file:///queue-b.mp3',
      title: 'Cola B',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 2,
      artwork: null,
    },
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: 'queue-a',
    url: tracks[0].uri,
    title: tracks[0].title,
  });
  jest.mocked(TrackPlayer.getQueue).mockResolvedValue(
    tracks.map(track => ({
      id: track.id,
      url: track.uri,
      title: track.title,
      artist: track.artist,
      album: track.album,
    })),
  );
  jest.mocked(createPlaylist).mockResolvedValue({
    id: 'saved-queue',
    name: 'Mi cola',
    createdAt: 1,
    trackIds: [],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    findPlayerOpenButton(renderer!).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir cola de reproducción con 2 canciones',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Guardar cola como lista' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Nombre de la lista' })
      .props.onChangeText('Mi cola');
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({ accessibilityLabel: 'Crear lista' })
      .props.onPress();
  });

  expect(createPlaylist).toHaveBeenCalledWith('Mi cola');
  expect(setPlaylistTracks).toHaveBeenCalledWith('saved-queue', [
    'queue-a',
    'queue-b',
  ]);
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('clears only upcoming tracks and keeps current playback', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  const tracks: Track[] = [
    {
      id: 'queue-current',
      uri: 'file:///current.mp3',
      title: 'Actual',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
    {
      id: 'queue-next',
      uri: 'file:///next.mp3',
      title: 'Siguiente',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 2,
      artwork: null,
    },
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: 'queue-current',
    url: tracks[0].uri,
    title: tracks[0].title,
  });
  jest.mocked(TrackPlayer.getQueue).mockResolvedValue(
    tracks.map(track => ({
      id: track.id,
      url: track.uri,
      title: track.title,
    })),
  );

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    findPlayerOpenButton(renderer!).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir cola de reproducción con 2 canciones',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Vaciar canciones siguientes' })
      .props.onPress();
  });
  const confirmClear = alertSpy.mock.calls[0][2]?.find(
    button => button.text === 'Vaciar',
  );
  await ReactTestRenderer.act(async () => {
    confirmClear?.onPress?.();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(TrackPlayer.removeUpcomingTracks).toHaveBeenCalledTimes(1);
  expect(TrackPlayer.reset).not.toHaveBeenCalled();
  await ReactTestRenderer.act(() => renderer!.unmount());
  alertSpy.mockRestore();
});

test('plays only the selected album or artist and keeps same-title albums separate', async () => {
  const tracks: Track[] = [
    {
      id: 'album-a-1',
      uri: 'file:///album-a-1.mp3',
      title: 'Tema A1',
      artist: 'Artista A',
      album: 'Homónimo',
      albumId: 'album-a',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
    {
      id: 'album-a-2',
      uri: 'file:///album-a-2.mp3',
      title: 'Tema A2',
      artist: 'Artista A',
      album: 'Homónimo',
      albumId: 'album-a',
      duration: 180,
      dateAdded: 2,
      artwork: null,
    },
    {
      id: 'album-b-1',
      uri: 'file:///album-b-1.mp3',
      title: 'Tema B1',
      artist: 'Artista B',
      album: 'Homónimo',
      albumId: 'album-b',
      duration: 180,
      dateAdded: 3,
      artwork: null,
    },
  ];
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Álbumes' })
      .props.onPress();
  });
  const albumButtons = renderer!.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Abrir álbum Homónimo' &&
      typeof node.props.onPress === 'function',
    { deep: false },
  );
  expect(albumButtons).toHaveLength(2);
  await ReactTestRenderer.act(() => {
    albumButtons[0].props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Reproducir álbum Homónimo' })
      .props.onPress();
  });
  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: 'album-a-1' }),
    expect.objectContaining({ id: 'album-a-2' }),
  ]);
  expect(TrackPlayer.skip).toHaveBeenLastCalledWith(0);
  expect(
    renderer!.root.findAllByProps({ accessibilityLabel: 'Artistas' }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Volver a álbumes' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Artistas' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Abrir artista Artista B' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Reproducir artista Artista B' })
      .props.onPress();
  });
  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: 'album-b-1' }),
  ]);
  expect(TrackPlayer.skip).toHaveBeenLastCalledWith(0);

  await ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});

test('shuffles upcoming tracks in the live queue and restores their prior order', async () => {
  const tracks: Track[] = ['song-1', 'song-2', 'song-3'].map((id, index) => ({
    id,
    uri: `file:///${id}.mp3`,
    title: `Tema ${index + 1}`,
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: index,
    artwork: null,
  }));
  const nativeQueue: PlayerTrack[] = tracks.map(track => ({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
  }));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: 'song-1',
    url: 'file:///song-1.mp3',
    title: 'Tema 1',
  });
  jest.mocked(TrackPlayer.getActiveTrackIndex).mockResolvedValue(0);
  jest.mocked(TrackPlayer.getQueue).mockImplementation(async () => nativeQueue);
  jest.mocked(TrackPlayer.move).mockImplementation(async (from, to) => {
    const [movedTrack] = nativeQueue.splice(from, 1);
    nativeQueue.splice(to, 0, movedTrack);
  });
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir reproductor: Tema 1 de Artista',
      })
      .props.onPress();
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Activar mezcla' })
      .props.onPress();
    await Promise.resolve();
  });
  expect(nativeQueue.map(track => track.id)).toEqual([
    'song-1',
    'song-3',
    'song-2',
  ]);
  expect(TrackPlayer.move).toHaveBeenCalledWith(2, 1);

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Desactivar mezcla' })
      .props.onPress();
    await Promise.resolve();
  });
  expect(nativeQueue.map(track => track.id)).toEqual([
    'song-1',
    'song-2',
    'song-3',
  ]);
  expect(TrackPlayer.move).toHaveBeenLastCalledWith(2, 1);

  await ReactTestRenderer.act(() => renderer!.unmount());
  randomSpy.mockRestore();
});

test('restores the pre-shuffle order after the library refreshes', async () => {
  const tracks: Track[] = ['song-1', 'song-2', 'song-3'].map((id, index) => ({
    id,
    uri: `file:///${id}.mp3`,
    title: `Tema ${index + 1}`,
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: index,
    artwork: null,
  }));
  const nativeQueue: PlayerTrack[] = tracks.map(track => ({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
  }));
  jest
    .mocked(getDeviceTracks)
    .mockImplementation(async () => tracks.map(track => ({ ...track })));
  jest.mocked(useActiveTrack).mockReturnValue({
    id: 'song-1',
    url: 'file:///song-1.mp3',
    title: 'Tema 1',
  });
  jest.mocked(TrackPlayer.getActiveTrackIndex).mockResolvedValue(0);
  jest.mocked(TrackPlayer.getQueue).mockImplementation(async () => nativeQueue);
  jest.mocked(TrackPlayer.move).mockImplementation(async (from, to) => {
    const [movedTrack] = nativeQueue.splice(from, 1);
    nativeQueue.splice(to, 0, movedTrack);
  });
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir reproductor: Tema 1 de Artista',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Activar mezcla' })
      .props.onPress();
    await Promise.resolve();
  });
  randomSpy.mockRestore();
  expect(nativeQueue.map(track => track.id)).toEqual([
    'song-1',
    'song-3',
    'song-2',
  ]);

  await ReactTestRenderer.act(async () => {
    DeviceEventEmitter.emit('musicLibraryChanged');
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Desactivar mezcla' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(nativeQueue.map(track => track.id)).toEqual([
    'song-1',
    'song-2',
    'song-3',
  ]);

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('starts the player at normal speed when the saved rate is invalid', async () => {
  jest.mocked(getPlaybackRate).mockResolvedValueOnce(3);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(TrackPlayer.setRate).toHaveBeenCalledWith(1);
  expect(JSON.stringify(renderer!.toJSON())).not.toContain(
    'No se pudo iniciar el reproductor',
  );

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('starts the player when the saved equalizer is invalid', async () => {
  jest.mocked(getEqualizerSettings).mockResolvedValueOnce({
    enabled: true,
    bandGainsDb: [40, 0, 0, 0, 0],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(TrackPlayer.setRate).toHaveBeenCalledWith(1);
  expect(JSON.stringify(renderer!.toJSON())).not.toContain(
    'No se pudo iniciar el reproductor',
  );

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('starts the player when the saved equalizer cannot be read', async () => {
  jest
    .mocked(getEqualizerSettings)
    .mockRejectedValueOnce(new Error('Ajustes dañados'));

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(TrackPlayer.setRate).toHaveBeenCalledWith(1);
  expect(JSON.stringify(renderer!.toJSON())).not.toContain(
    'No se pudo iniciar el reproductor',
  );

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('adds a song to the next position without replacing the active queue', async () => {
  const tracks: Track[] = ['song-1', 'song-2'].map((id, index) => ({
    id,
    uri: `file:///${id}.mp3`,
    title: `Tema ${index + 1}`,
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: index,
    artwork: null,
  }));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: 'song-1',
    url: 'file:///song-1.mp3',
    title: 'Tema 1',
  });
  jest.mocked(TrackPlayer.getQueue).mockResolvedValue([
    {
      id: 'song-1',
      url: 'file:///song-1.mp3',
      title: 'Tema 1',
      artist: 'Artista',
    },
  ]);
  jest.mocked(TrackPlayer.getActiveTrackIndex).mockResolvedValue(0);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Más acciones para Tema 2',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Reproducir Tema 2 a continuación',
      })
      .props.onPress();
    await Promise.resolve();
  });

  expect(TrackPlayer.add).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'song-2' }),
    1,
  );
  expect(TrackPlayer.reset).not.toHaveBeenCalled();
  expect(TrackPlayer.play).not.toHaveBeenCalled();

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('refreshes the library after MediaStore reports a change', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  const callsBeforeChange = jest.mocked(getDeviceTracks).mock.calls.length;
  await ReactTestRenderer.act(async () => {
    DeviceEventEmitter.emit('musicLibraryChanged');
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(jest.mocked(getDeviceTracks).mock.calls.length).toBeGreaterThan(
    callsBeforeChange,
  );

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('offers device deletion from a library track menu and confirms it', async () => {
  const track: Track = {
    id: 'song-delete',
    uri: 'content://media/external/audio/media/9',
    title: 'Tema para eliminar',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValueOnce([track]);
  jest.mocked(deleteTrackFromDevice).mockResolvedValue(true);
  let alertButtons: Parameters<typeof Alert.alert>[2] | undefined;
  const alertSpy = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons;
    });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Más acciones para Tema para eliminar',
      })
      .props.onPress();
  });

  const deleteAction = renderer!.root.findByProps({
    accessibilityLabel: 'Eliminar Tema para eliminar del dispositivo',
  });
  await ReactTestRenderer.act(() => deleteAction.props.onPress());
  expect(alertSpy).toHaveBeenCalledWith(
    'Eliminar del dispositivo',
    expect.stringContaining('Esta acción no se puede deshacer'),
    expect.any(Array),
  );
  expect(deleteTrackFromDevice).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    alertButtons?.find(button => button.text === 'Eliminar')?.onPress?.();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(deleteTrackFromDevice).toHaveBeenCalledWith(track.id);

  await ReactTestRenderer.act(() => renderer!.unmount());
  alertSpy.mockRestore();
});

test('does not offer device deletion from the home feed', async () => {
  const track: Track = {
    id: 'song-home',
    uri: 'content://media/external/audio/media/11',
    title: 'Tema de inicio',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValueOnce([track]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Más acciones para Tema de inicio' })
      .props.onPress();
  });

  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Eliminar Tema de inicio del dispositivo',
    }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('canceling the app confirmation leaves the track untouched', async () => {
  const track: Track = {
    id: 'song-delete-cancel',
    uri: 'content://media/external/audio/media/10',
    title: 'Tema para conservar',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([track]);
  let alertButtons: Parameters<typeof Alert.alert>[2] | undefined;
  const alertSpy = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons;
    });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Más acciones para Tema para conservar',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Eliminar Tema para conservar del dispositivo',
      })
      .props.onPress();
  });

  await ReactTestRenderer.act(() => {
    alertButtons?.find(button => button.text === 'Cancelar')?.onPress?.();
  });
  expect(deleteTrackFromDevice).not.toHaveBeenCalled();
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Más acciones para Tema para conservar',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(() => renderer!.unmount());
  alertSpy.mockRestore();
});

test('deleting the active track pauses and removes it from the player queue', async () => {
  const activeTrack: Track = {
    id: 'song-active-delete',
    uri: 'content://media/external/audio/media/11',
    title: 'Tema en reproducción',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  const nextTrack: Track = {
    ...activeTrack,
    id: 'song-next-delete',
    uri: 'content://media/external/audio/media/12',
    title: 'Tema siguiente',
    dateAdded: 2,
  };
  const playerTrack = (track: Track): PlayerTrack =>
    ({
      id: track.id,
      url: track.uri,
      title: track.title,
      artist: track.artist,
    } as PlayerTrack);

  jest
    .mocked(getDeviceTracks)
    .mockResolvedValueOnce([activeTrack, nextTrack])
    .mockResolvedValueOnce([nextTrack]);
  jest.mocked(useActiveTrack).mockReturnValue(playerTrack(activeTrack));
  jest
    .mocked(TrackPlayer.getQueue)
    .mockResolvedValue([playerTrack(activeTrack), playerTrack(nextTrack)]);
  jest.mocked(TrackPlayer.getActiveTrackIndex).mockResolvedValue(0);
  jest.mocked(deleteTrackFromDevice).mockResolvedValue(true);

  let alertButtons: Parameters<typeof Alert.alert>[2] | undefined;
  const alertSpy = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons;
    });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Más acciones para Tema en reproducción',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Eliminar Tema en reproducción del dispositivo',
      })
      .props.onPress();
  });

  await ReactTestRenderer.act(async () => {
    alertButtons?.find(button => button.text === 'Eliminar')?.onPress?.();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(deleteTrackFromDevice).toHaveBeenCalledWith(activeTrack.id);
  expect(TrackPlayer.pause).toHaveBeenCalled();
  expect(TrackPlayer.remove).toHaveBeenCalledWith(0);
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Más acciones para Tema en reproducción',
    }),
  ).toHaveLength(0);
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Más acciones para Tema siguiente',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(() => renderer!.unmount());
  alertSpy.mockRestore();
});

test('keeps playlist track actions focused on playback, dragging, and removal', async () => {
  const track: Track = {
    id: 'song-in-playlist',
    uri: 'file:///song-in-playlist.mp3',
    title: 'Tema de lista',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  const playlist: Playlist = {
    id: 'playlist-delete-scope',
    name: 'Mi lista',
    createdAt: 1,
    trackIds: [track.id],
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([track]);
  jest.mocked(getPlaylists).mockResolvedValue([playlist]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Listas' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir lista Mi lista, 1 canción',
      })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Arrastrar Tema de lista para reordenar',
    }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Quitar Tema de lista de Mi lista',
    }),
  ).toBeTruthy();
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Añadir Tema de lista a favoritos',
    }),
  ).toHaveLength(0);
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Más acciones para Tema de lista',
    }),
  ).toHaveLength(0);
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Eliminar Tema de lista del dispositivo',
    }),
  ).toHaveLength(0);
  const sectionTabLabels = [
    'Canciones',
    'Álbumes',
    'Artistas',
    'Favoritas',
    'Recientes',
    'Listas',
  ];
  expect(
    renderer!.root.findAll(
      node =>
        node.props.accessibilityRole === 'tab' &&
        sectionTabLabels.includes(node.props.accessibilityLabel),
    ),
  ).toHaveLength(0);
  expect(
    renderer!.root.findAll(node => node.props.children === '01'),
  ).toHaveLength(0);

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('sleep timer pauses at its selected deadline and can be canceled', async () => {
  const track: Track = {
    id: 'timer-song',
    uri: 'file:///timer-song.mp3',
    title: 'Tema con temporizador',
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
  };
  jest.mocked(getDeviceTracks).mockResolvedValue([track]);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: track.id,
    url: track.uri,
    title: track.title,
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: `Abrir reproductor: ${track.title} de Artista`,
      })
      .props.onPress();
  });
  jest.useFakeTimers();

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Configurar temporizador de apagado' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Pausar en 15 minutos' })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Temporizador, 15:00 restantes',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Temporizador, 15:00 restantes',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Cancelar temporizador' })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Configurar temporizador de apagado',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Configurar temporizador de apagado' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Pausar en 15 minutos' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await jest.advanceTimersByTimeAsync(15 * 60 * 1000);
  });
  expect(TrackPlayer.pause).toHaveBeenCalled();

  await ReactTestRenderer.act(() => renderer!.unmount());
  jest.useRealTimers();
});

test('hardware back returns from playlist detail, then returns to the library', async () => {
  const playlist: Playlist = {
    id: 'playlist-back',
    name: 'Para después',
    createdAt: 1,
    trackIds: ['missing-track'],
  };
  type BackHandlerCallback = Parameters<typeof BackHandler.addEventListener>[1];
  const handlers: BackHandlerCallback[] = [];
  const remove = jest.fn();
  const addListener = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_eventName, listener) => {
      handlers.push(listener);
      return { remove };
    });
  jest.mocked(getPlaylists).mockResolvedValue([playlist]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Listas' })
      .props.onPress();
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Abrir lista Para después, 0 canciones',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir lista Para después, 0 canciones',
      })
      .props.onPress();
  });
  expect(renderer!.root.findByProps({ children: 'Para después' })).toBeTruthy();

  await ReactTestRenderer.act(() => {
    expect(handlers[handlers.length - 1]({} as never)).toBe(true);
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Abrir lista Para después, 0 canciones',
    }),
  ).toBeTruthy();

  await ReactTestRenderer.act(() => {
    expect(handlers[handlers.length - 1]({} as never)).toBe(true);
  });
  expect(
    renderer!.root.findAllByProps({ children: 'Biblioteca' }).length,
  ).toBeGreaterThan(0);
  await ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
  expect(remove).toHaveBeenCalled();
  addListener.mockRestore();
});

test('creates a playlist, adds songs, and plays only its saved tracks', async () => {
  const tracks: Track[] = [
    {
      id: 'song-1',
      uri: 'file:///song-1.mp3',
      title: 'Tema uno',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
    {
      id: 'song-2',
      uri: 'file:///song-2.mp3',
      title: 'Tema dos',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 200,
      dateAdded: 2,
      artwork: null,
    },
  ];
  const playlist: Playlist = {
    id: 'playlist-1',
    name: 'Favoritas para correr',
    createdAt: 1,
    trackIds: [],
  };
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest
    .mocked(getPlaylists)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([playlist])
    .mockResolvedValueOnce([{ ...playlist, trackIds: ['song-2'] }]);
  jest.mocked(createPlaylist).mockResolvedValue(playlist);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Listas' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Crear lista de reproducción' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Nombre de la lista' })
      .props.onChangeText(playlist.name);
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({ accessibilityLabel: 'Crear lista' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: `Añadir canciones a ${playlist.name}`,
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Tema dos de Artista' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({ accessibilityLabel: 'Guardar canciones seleccionadas' })
      .props.onPress();
  });

  expect(createPlaylist).toHaveBeenCalledWith(playlist.name);
  expect(setPlaylistTracks).toHaveBeenCalledWith('playlist-1', ['song-2']);

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({
        accessibilityLabel: `Reproducir lista ${playlist.name}`,
      })
      .props.onPress();
    await Promise.resolve();
  });
  expect(TrackPlayer.add).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: 'song-2', url: 'file:///song-2.mp3' }),
  ]);
  expect(TrackPlayer.skip).toHaveBeenLastCalledWith(0);

  await ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});

test('renames and deletes a playlist without deleting its audio', async () => {
  const playlist: Playlist = {
    id: 'playlist-2',
    name: 'Entrenamiento',
    createdAt: 2,
    trackIds: ['song-1'],
  };
  const renamedPlaylist = { ...playlist, name: 'Correr' };
  jest.mocked(getDeviceTracks).mockResolvedValue([]);
  jest
    .mocked(getPlaylists)
    .mockReset()
    .mockResolvedValueOnce([playlist])
    .mockResolvedValueOnce([renamedPlaylist])
    .mockResolvedValueOnce([]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Listas' })
      .props.onPress();
  });
  expect(
    renderer!.root.findAllByProps({
      accessibilityLabel: 'Eliminar Entrenamiento',
    }),
  ).toHaveLength(0);
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Más acciones para Entrenamiento' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Renombrar Entrenamiento' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Nombre de la lista' })
      .props.onChangeText(renamedPlaylist.name);
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({ accessibilityLabel: 'Guardar nombre de la lista' })
      .props.onPress();
  });

  expect(renamePlaylist).toHaveBeenCalledWith(
    playlist.id,
    renamedPlaylist.name,
  );
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: `Más acciones para ${renamedPlaylist.name}`,
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: `Eliminar ${renamedPlaylist.name}` })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({
        accessibilityLabel: `Confirmar eliminación de ${renamedPlaylist.name}`,
      })
      .props.onPress();
  });

  expect(deletePlaylist).toHaveBeenCalledWith(playlist.id);
  expect(
    renderer!.root.findByProps({ children: 'Aún no tienes listas' }),
  ).toBeTruthy();
  await ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});

test('reorders and removes songs from the playback queue', async () => {
  const tracks: Track[] = [
    {
      id: 'song-1',
      uri: 'file:///song-1.mp3',
      title: 'Tema uno',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 180,
      dateAdded: 1,
      artwork: null,
    },
    {
      id: 'song-2',
      uri: 'file:///song-2.mp3',
      title: 'Tema dos',
      artist: 'Artista',
      album: 'Álbum',
      albumId: 'album-1',
      duration: 200,
      dateAdded: 2,
      artwork: null,
    },
  ];
  const queue = tracks.map(track => ({
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
  }));
  jest.mocked(getDeviceTracks).mockResolvedValue(tracks);
  jest.mocked(useActiveTrack).mockReturnValue({
    id: 'song-1',
    url: 'file:///song-1.mp3',
    title: 'Tema uno',
  });
  jest
    .mocked(TrackPlayer.getQueue)
    .mockResolvedValueOnce(queue)
    .mockResolvedValueOnce([queue[1], queue[0]])
    .mockResolvedValueOnce([queue[0]])
    .mockResolvedValueOnce([queue[1], queue[0]]);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = createLibraryApp();
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir reproductor: Tema uno de Artista',
      })
      .props.onPress();
  });
  const progressSlider = renderer!.root.findByProps({
    accessibilityLabel: 'Avanzar en la canción',
  });
  await ReactTestRenderer.act(() => {
    progressSlider.props.onLayout({
      nativeEvent: { layout: { width: 300 } },
    });
  });
  const createTouchEvent = (
    locationX: number,
    previousX: number,
    currentX: number,
    timestamp: number,
  ) => ({
    nativeEvent: { locationX },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX: currentX,
          currentPageY: 0,
          currentTimeStamp: timestamp,
          previousPageX: previousX,
          previousPageY: 0,
          touchActive: true,
        },
      ],
    },
  });
  await ReactTestRenderer.act(async () => {
    const tapEvent = createTouchEvent(225, 225, 225, 1);
    progressSlider.props.onResponderGrant(tapEvent);
    progressSlider.props.onResponderRelease(tapEvent);
    await Promise.resolve();
  });
  expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(135);

  await ReactTestRenderer.act(async () => {
    progressSlider.props.onResponderGrant(createTouchEvent(60, 60, 60, 2));
    progressSlider.props.onResponderMove(createTouchEvent(60, 60, 150, 3));
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Avanzar en la canción',
    }).props.accessibilityValue.now,
  ).toBe(90);
  await ReactTestRenderer.act(async () => {
    progressSlider.props.onResponderRelease({});
    await Promise.resolve();
  });
  expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(90);

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Abrir cola de reproducción con 2 canciones',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  const dragHandle = renderer!.root.findByProps({
    accessibilityLabel: 'Arrastrar Tema dos para reordenar',
  });
  expect(dragHandle.props.onStartShouldSetResponder({})).toBe(true);
  await ReactTestRenderer.act(async () => {
    dragHandle.props.onAccessibilityAction({
      nativeEvent: { actionName: 'increment' },
    });
    await Promise.resolve();
  });
  expect(TrackPlayer.move).toHaveBeenCalledWith(1, 0);
  const removeTrackButton = renderer!.root.findByProps({
    accessibilityLabel: 'Quitar Tema dos de la cola',
  });
  expect(removeTrackButton.props.accessibilityState).toEqual({
    disabled: false,
  });
  await ReactTestRenderer.act(async () => {
    removeTrackButton.props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(TrackPlayer.move).toHaveBeenCalledWith(1, 0);
  expect(TrackPlayer.remove).toHaveBeenCalledWith(0);
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Deshacer eliminación, 3 segundos',
    }),
  ).toBeTruthy();
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({
        accessibilityLabel: 'Deshacer eliminación, 3 segundos',
      })
      .props.onPress();
    await Promise.resolve();
  });
  expect(TrackPlayer.add).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'song-2' }),
    0,
  );
  await ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});
