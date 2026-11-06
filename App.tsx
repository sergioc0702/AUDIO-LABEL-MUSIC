import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
} from 'react';
import {
  AppState,
  Animated,
  Alert,
  BackHandler,
  DeviceEventEmitter,
  Easing,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Home,
  MoreVertical,
  Music2,
  Play,
  Search,
  SkipForward,
  X,
} from 'lucide-react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  RepeatMode,
  State,
  useActiveTrack,
  usePlaybackState,
} from 'react-native-track-player';
import {
  addPlayerTrack,
  getActivePlayerTrackIndex,
  getPlayerQueue,
  movePlayerTrack,
  pausePlayer,
  playPlayer,
  getPlayerRepeatMode,
  removePlayerTrack,
  removeUpcomingPlayerTracks,
  replacePlayerQueue,
  resetPlayerQueue,
  seekPlayerTo,
  setPlayerRate,
  setPlayerRepeatMode,
  setupPlayer,
  skipToNextPlayerTrack,
  skipToPlayerTrack,
  skipToPreviousPlayerTrack,
} from './src/services/player';
import {
  createPlaylist,
  clearPlaybackHistory,
  deleteTrackFromDevice,
  deletePlaylist,
  getDeviceTracks,
  getEqualizerSettings,
  getFavoriteTrackIds,
  getPlaybackRate,
  getPlaylists,
  getRecentPlayback,
  renamePlaylist,
  recordPlaybackHistory,
  setPlaybackRate as persistPlaybackRate,
  setEqualizerSettings as persistEqualizerSettings,
  setPlaylistTracks,
  setTrackFavorite,
} from './src/native/musicLibrary';
import type { EqualizerSettings } from './src/native/musicLibrary';
import type {
  LibraryTab,
  Playlist,
  RecentPlayback,
  Track,
} from './src/types/Track';
import { filterAndSortTracks, type TrackSort } from './src/utils/sortTracks';
import {
  restoreUpcomingTrackOrder,
  shuffleTracks,
  shuffleUpcomingTracks,
} from './src/utils/shuffleQueue';
import { darkDesignTokens } from './src/theme/tokens';
import { normalizeGenre } from './src/utils/sortTracks';
import {
  DesignThemeContext,
  useDesignTokens,
} from './src/theme/DesignThemeContext';
import { createStyles } from './src/theme/createStyles';
import { formatTime } from './src/utils/formatTime';
import { formatTrackCount } from './src/utils/formatTrackCount';
import {
  Artwork,
  CurrentTrackIndicator,
  FavoriteSwipeRow,
  PlaylistTrackRow,
} from './src/components/library/LibraryComponents';
import { MiniPlayerProgress } from './src/components/player/PlaybackProgress';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import {
  type GroupedLibraryItem,
  type SelectedGroup,
} from './src/screens/LibraryScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { equalizerBands, PlayerScreen } from './src/screens/PlayerScreen';

const navigationItems: {
  id: 'home' | 'search' | 'library';
  label: string;
  icon: typeof Music2;
}[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'library', label: 'Biblioteca', icon: Music2 },
];
const librarySections: {
  id: LibraryTab | 'favorites';
  label: string;
}[] = [
  { id: 'songs', label: 'Canciones' },
  { id: 'albums', label: 'Álbumes' },
  { id: 'artists', label: 'Artistas' },
  { id: 'favorites', label: 'Favoritas' },
  { id: 'recent', label: 'Recientes' },
  { id: 'playlists', label: 'Listas' },
];

const trackSorts: { id: TrackSort; label: string }[] = [
  { id: 'titleAsc', label: 'Nombre A–Z' },
  { id: 'titleDesc', label: 'Nombre Z–A' },
  { id: 'dateAdded', label: 'Añadidas' },
];
const playbackRates = [0.75, 1, 1.25, 1.5, 2];
type LibraryFilter = 'all' | 'favorites';
type PrimaryScreen = 'home' | 'search' | 'library';
type PendingQueueRemoval = {
  track: Track;
  index: number;
  originalIndex: number;
  wasCurrent: boolean;
  wasPlaying: boolean;
  position: number;
  nextTrackId: string | null;
};
function AppContent({
  initialScreen = 'home',
}: {
  initialScreen?: PrimaryScreen;
}) {
  const tokens = useDesignTokens();
  const { colors } = tokens;
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const safeAreaInsets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(
    null,
  );
  const [playlistNameDialog, setPlaylistNameDialog] = useState<{
    playlistId: string | null;
    name: string;
    trackIds?: string[];
  } | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null,
  );
  const [trackPickerPlaylistId, setTrackPickerPlaylistId] = useState<
    string | null
  >(null);
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState('');
  const [draftPlaylistTrackIds, setDraftPlaylistTrackIds] = useState<
    Set<string>
  >(new Set());
  const [playlistDialogError, setPlaylistDialogError] = useState<string | null>(
    null,
  );
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [queueUpdating, setQueueUpdating] = useState(false);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [pendingQueueRemoval, setPendingQueueRemoval] =
    useState<PendingQueueRemoval | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentPlayback, setRecentPlayback] = useState<RecentPlayback[]>([]);
  const [primaryScreen, setPrimaryScreen] =
    useState<PrimaryScreen>(initialScreen);
  const [activeTab, setActiveTab] = useState<LibraryTab>('songs');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [queueTrackDialog, setQueueTrackDialog] = useState<{
    track: Track;
    fromLibrary: boolean;
  } | null>(null);
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [sleepTimerDeadline, setSleepTimerDeadline] = useState<number | null>(
    null,
  );
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(0);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [playbackSourceLabel, setPlaybackSourceLabel] =
    useState('Tu biblioteca');
  const [trackSort, setTrackSort] = useState<TrackSort>('titleAsc');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [equalizerVisible, setEqualizerVisible] = useState(false);
  const [equalizerSettings, setEqualizerSettings] = useState<EqualizerSettings>(
    {
      enabled: false,
      bandGainsDb: [0, 0, 0, 0, 0],
    },
  );
  const [search, setSearch] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [errorMessage, setErrorMessageState] = useState<string | null>(null);
  const [errorRetryAction, setErrorRetryAction] = useState<(() => void) | null>(
    null,
  );
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(RepeatMode.Off);
  const queueOperationInProgress = useRef(false);
  const libraryLoadInProgress = useRef(false);
  const libraryRefreshPending = useRef(false);
  const hasLibraryPermission = useRef(false);
  const originalQueueOrder = useRef<Track[]>([]);
  const queueScrollRef = useRef<FlatList<Track>>(null);
  const queueViewportRef = useRef<ElementRef<typeof View>>(null);
  const queueScrollOffset = useRef(0);
  const queueScrollContentHeight = useRef(0);
  const queueScrollViewport = useRef({ top: 0, height: 0 });
  const lastQueueAutoScrollAt = useRef(0);
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerInterval = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const sleepTimerDeadlineRef = useRef<number | null>(null);
  const queueNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const equalizerWriteChain = useRef<Promise<void>>(Promise.resolve());
  const expireSleepTimerRef = useRef<() => void>(() => undefined);
  const lastRecordedTrackId = useRef<string | null>(null);
  const playbackPosition = useRef(0);
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const expandedArtworkSize = Math.min(
    screenWidth - 80,
    screenHeight * 0.34,
    340,
  );
  const currentTrack =
    tracks.find(track => track.id === activeTrack?.id) ?? null;
  const visibleTracks = useMemo(() => {
    return filterAndSortTracks(tracks, {
      query: search,
      favoritesOnly: activeTab === 'songs' && libraryFilter === 'favorites',
      favoriteIds,
      sort: trackSort,
      genre: selectedGenre,
    });
  }, [
    activeTab,
    favoriteIds,
    libraryFilter,
    search,
    selectedGenre,
    trackSort,
    tracks,
  ]);
  const availableGenres = useMemo(
    () =>
      Array.from(
        new Set(
          tracks
            .map(track => normalizeGenre(track.genre))
            .filter((genre): genre is string => Boolean(genre)),
        ),
      ).sort((first, second) => first.localeCompare(second, 'es')),
    [tracks],
  );
  const recentTracks = useMemo(() => {
    const tracksById = new Map(tracks.map(track => [track.id, track]));
    const query = search.trim().toLocaleLowerCase();
    return recentPlayback
      .map(entry => tracksById.get(entry.trackId))
      .filter((track): track is Track => track !== undefined)
      .filter(
        track =>
          !query ||
          `${track.title} ${track.artist} ${track.album}`
            .toLocaleLowerCase()
            .includes(query),
      );
  }, [recentPlayback, search, tracks]);
  const homeRecentTracks = useMemo(
    () =>
      recentTracks
        .filter(
          (track, index, list) =>
            list.findIndex(item => item.id === track.id) === index,
        )
        .slice(0, 8),
    [recentTracks],
  );
  const homeAddedTracks = useMemo(
    () =>
      [...tracks]
        .sort((first, second) => second.dateAdded - first.dateAdded)
        .slice(0, 4),
    [tracks],
  );

  const selectedPlaylist =
    activeTab === 'playlists'
      ? playlists.find(playlist => playlist.id === selectedPlaylistId) ?? null
      : null;
  const playlistTracksById = useMemo(() => {
    const tracksById = new Map(tracks.map(track => [track.id, track]));
    return new Map(
      playlists.map(playlist => [
        playlist.id,
        playlist.trackIds
          .map(trackId => tracksById.get(trackId))
          .filter((track): track is Track => track !== undefined),
      ]),
    );
  }, [playlists, tracks]);
  const playlistTracks = useMemo(
    () =>
      selectedPlaylist ? playlistTracksById.get(selectedPlaylist.id) ?? [] : [],
    [playlistTracksById, selectedPlaylist],
  );
  const visiblePlaylistTracks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return playlistTracks;
    }
    return playlistTracks.filter(track =>
      `${track.title} ${track.artist} ${track.album}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [playlistTracks, search]);
  const visibleSelectedGroupTracks = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }
    const query = search.trim().toLocaleLowerCase();
    return query
      ? selectedGroup.tracks.filter(track =>
          `${track.title} ${track.artist} ${track.album}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : selectedGroup.tracks;
  }, [search, selectedGroup]);
  const visiblePlaylists = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? playlists.filter(playlist =>
          playlist.name.toLocaleLowerCase().includes(query),
        )
      : playlists;
  }, [playlists, search]);
  const groupedLibrary = useMemo<GroupedLibraryItem[]>(() => {
    if (activeTab !== 'albums' && activeTab !== 'artists') {
      return [];
    }

    const grouped = new Map<string, GroupedLibraryItem>();
    visibleTracks.forEach(track => {
      const name = activeTab === 'albums' ? track.album : track.artist;
      const identity =
        activeTab === 'albums'
          ? track.albumId && track.albumId !== '0'
            ? track.albumId
            : `${track.album}\u0000${track.artist}`
          : track.artist.toLocaleLowerCase();
      const key = `${activeTab}:${identity}`;
      const group = grouped.get(key);
      if (group) {
        group.tracks.push(track);
      } else {
        grouped.set(key, { key, name, tracks: [track] });
      }
    });

    return Array.from(grouped.values());
  }, [activeTab, visibleTracks]);
  const visiblePlaylistPickerTracks = useMemo(
    () =>
      filterAndSortTracks(tracks, {
        query: playlistTrackSearch,
        favoritesOnly: false,
        favoriteIds,
        sort: trackSort,
      }),
    [favoriteIds, playlistTrackSearch, trackSort, tracks],
  );

  const activeNavigationItem =
    activeTab === 'songs' && libraryFilter === 'favorites'
      ? 'favorites'
      : activeTab;
  const navigationScale = useRef(new Animated.Value(1)).current;
  const screenTransitionProgress = useRef(new Animated.Value(1)).current;
  const libraryScrollRef = useRef<FlatList<Track>>(null);
  const libraryScrollY = useRef(new Animated.Value(0)).current;
  const screenTransitionKey =
    primaryScreen === 'library'
      ? `${primaryScreen}:${activeTab}:${selectedGroup?.name ?? ''}:${
          selectedPlaylistId ?? ''
        }`
      : primaryScreen;

  const setErrorMessage = useCallback((message: string | null) => {
    setErrorMessageState(message);
    setErrorRetryAction(null);
  }, []);
  const setRetryableError = useCallback(
    (message: string, retryAction: () => void) => {
      setErrorMessageState(message);
      setErrorRetryAction(() => retryAction);
    },
    [],
  );

  const rememberPlaybackPosition = useCallback((position: number) => {
    playbackPosition.current = position;
  }, []);

  useEffect(() => {
    libraryScrollY.setValue(0);
  }, [
    activeTab,
    libraryFilter,
    libraryScrollY,
    primaryScreen,
    selectedGroup,
    selectedPlaylistId,
  ]);

  useEffect(() => {
    navigationScale.setValue(0.88);
    Animated.spring(navigationScale, {
      toValue: 1,
      damping: 16,
      mass: 0.7,
      stiffness: 190,
      useNativeDriver: true,
    }).start();
  }, [primaryScreen, navigationScale]);

  useEffect(() => {
    screenTransitionProgress.stopAnimation();
    screenTransitionProgress.setValue(0);
    const transition = Animated.timing(screenTransitionProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    transition.start();
    return () => transition.stop();
  }, [screenTransitionKey, screenTransitionProgress]);

  const loadLibrary = useCallback(
    async (requestPermission = true) => {
      if (libraryLoadInProgress.current) {
        if (!requestPermission) {
          libraryRefreshPending.current = true;
        }
        return;
      }
      if (!requestPermission && !hasLibraryPermission.current) {
        return;
      }

      libraryLoadInProgress.current = true;
      if (requestPermission) {
        setLoadingLibrary(true);
      }
      if (requestPermission) {
        setErrorMessage(null);
      }

      try {
        if (requestPermission) {
          const permission =
            Number(Platform.Version) >= 33
              ? 'android.permission.READ_MEDIA_AUDIO'
              : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          const granted = await PermissionsAndroid.request(permission, {
            title: 'Acceso a tu música',
            message:
              'Mi Música necesita permiso para encontrar canciones y leer sus metadatos en este dispositivo.',
            buttonPositive: 'Permitir',
            buttonNegative: 'Ahora no',
          });

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            hasLibraryPermission.current = false;
            setTracks([]);
            setRetryableError(
              'Sin permiso no podemos mostrar la música del dispositivo. Puedes volver a intentarlo cuando quieras.',
              () => loadLibrary(),
            );
            return;
          }
          hasLibraryPermission.current = true;

          if (Number(Platform.Version) >= 33) {
            await PermissionsAndroid.request(
              'android.permission.POST_NOTIFICATIONS',
            );
          }
        }

        const [deviceTracks, favoriteTrackIds] = await Promise.all([
          getDeviceTracks(),
          getFavoriteTrackIds(),
        ]);
        setTracks(deviceTracks);
        setFavoriteIds(new Set(favoriteTrackIds));
      } catch (error) {
        setRetryableError(
          error instanceof Error
            ? error.message
            : 'No se pudo leer la biblioteca de música.',
          () => loadLibrary(),
        );
      } finally {
        libraryLoadInProgress.current = false;
        if (requestPermission) {
          setLoadingLibrary(false);
        }
        if (libraryRefreshPending.current && hasLibraryPermission.current) {
          libraryRefreshPending.current = false;
          loadLibrary(false);
        }
      }
    },
    [setErrorMessage, setRetryableError],
  );

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      setPlaylists(await getPlaylists());
    } catch (error) {
      setRetryableError(
        error instanceof Error
          ? `No se pudieron cargar las listas: ${error.message}`
          : 'No se pudieron cargar las listas de reproducción.',
        () => loadPlaylists(),
      );
    } finally {
      setLoadingPlaylists(false);
    }
  }, [setRetryableError]);

  const loadPlaybackHistory = useCallback(async () => {
    try {
      setRecentPlayback(await getRecentPlayback());
    } catch (error) {
      setRetryableError(
        error instanceof Error
          ? `No se pudo cargar el historial: ${error.message}`
          : 'No se pudo cargar el historial de reproducción.',
        () => loadPlaybackHistory(),
      );
    }
  }, [setRetryableError]);

  useEffect(() => {
    let mounted = true;

    async function preparePlayer() {
      try {
        const savedEqualizer = await getEqualizerSettings();
        if (
          savedEqualizer.bandGainsDb.length !== equalizerBands.length ||
          savedEqualizer.bandGainsDb.some(
            gain => !Number.isFinite(gain) || gain < -12 || gain > 12,
          )
        ) {
          throw new Error(
            'La configuración guardada del ecualizador no es válida.',
          );
        }
        if (mounted) {
          setEqualizerSettings(savedEqualizer);
        }
        await setupPlayer();
        const savedRepeatMode = await getPlayerRepeatMode();
        const savedRate = await getPlaybackRate();
        if (!playbackRates.includes(savedRate)) {
          throw new Error('La velocidad guardada no es compatible.');
        }
        await setPlayerRate(savedRate);
        if (mounted) {
          setRepeatMode(savedRepeatMode);
          setPlaybackRate(savedRate);
          setPlayerReady(true);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? `No se pudo iniciar el reproductor: ${error.message}`
              : 'No se pudo iniciar el reproductor.',
          );
        }
      }
    }

    preparePlayer();
    loadLibrary();
    loadPlaylists();
    loadPlaybackHistory();

    return () => {
      mounted = false;
    };
  }, [
    loadLibrary,
    loadPlaybackHistory,
    loadPlaylists,
    setErrorMessage,
    setRetryableError,
  ]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        const returnedToForeground =
          nextState === 'active' && previousState !== 'active';
        previousState = nextState;
        if (returnedToForeground && hasLibraryPermission.current) {
          loadLibrary(false);
        }
      },
    );
    const librarySubscription = DeviceEventEmitter.addListener(
      'musicLibraryChanged',
      () => {
        if (hasLibraryPermission.current) {
          loadLibrary(false);
        }
      },
    );

    return () => {
      appStateSubscription.remove();
      librarySubscription.remove();
    };
  }, [loadLibrary]);

  useEffect(() => {
    const trackId = activeTrack?.id;
    if (
      !playerReady ||
      !trackId ||
      lastRecordedTrackId.current === trackId ||
      !tracks.some(track => track.id === trackId)
    ) {
      return;
    }

    lastRecordedTrackId.current = trackId;
    recordPlaybackHistory(trackId)
      .then(loadPlaybackHistory)
      .catch(error => {
        setErrorMessage(
          error instanceof Error
            ? `No se pudo guardar el historial: ${error.message}`
            : 'No se pudo guardar el historial de reproducción.',
        );
      });
  }, [
    activeTrack?.id,
    loadPlaybackHistory,
    playerReady,
    setErrorMessage,
    tracks,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (primaryScreen === 'search') {
          setPrimaryScreen('home');
          setSearch('');
          return true;
        }

        if (selectedGroup) {
          setSelectedGroup(null);
          setSearch('');
          return true;
        }

        if (activeTab === 'playlists' && selectedPlaylistId !== null) {
          setSelectedPlaylistId(null);
          setSearch('');
          return true;
        }

        if (activeTab !== 'songs' || libraryFilter === 'favorites') {
          setActiveTab('songs');
          setLibraryFilter('all');
          setSelectedPlaylistId(null);
          setSearch('');
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [
    activeTab,
    libraryFilter,
    primaryScreen,
    selectedGroup,
    selectedPlaylistId,
  ]);

  useEffect(() => {
    if (!playerReady || tracks.length === 0) {
      return;
    }

    getPlayerQueue()
      .then(queue => {
        const tracksById = new Map(tracks.map(track => [track.id, track]));
        setPlaybackQueue(
          queue
            .map(item => tracksById.get(String(item.id)))
            .filter((track): track is Track => track !== undefined),
        );
        originalQueueOrder.current = queue
          .map(item => tracksById.get(String(item.id)))
          .filter((track): track is Track => track !== undefined);
      })
      .catch(error => {
        setErrorMessage(
          error instanceof Error
            ? `No se pudo recuperar la cola: ${error.message}`
            : 'No se pudo recuperar la cola de reproducción.',
        );
      });
  }, [playerReady, setErrorMessage, tracks]);

  useEffect(
    () => () => {
      if (undoTimeout.current) {
        clearTimeout(undoTimeout.current);
      }
      if (undoInterval.current) {
        clearInterval(undoInterval.current);
      }
      if (sleepTimerTimeout.current) {
        clearTimeout(sleepTimerTimeout.current);
      }
      if (sleepTimerInterval.current) {
        clearInterval(sleepTimerInterval.current);
      }
      if (queueNoticeTimeout.current) {
        clearTimeout(queueNoticeTimeout.current);
      }
    },
    [],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', () => {
      const deadline = sleepTimerDeadlineRef.current;
      if (deadline === null) {
        return;
      }
      const remainingSeconds = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      );
      setSleepTimerSecondsLeft(remainingSeconds);
      if (remainingSeconds === 0) {
        expireSleepTimerRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  async function toggleFavorite(track: Track) {
    const isFavorite = !favoriteIds.has(track.id);
    try {
      await setTrackFavorite(track.id, isFavorite);
      setFavoriteIds(current => {
        const updated = new Set(current);
        if (isFavorite) {
          updated.add(track.id);
        } else {
          updated.delete(track.id);
        }
        return updated;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo actualizar favoritos: ${error.message}`
          : 'No se pudo actualizar favoritos.',
      );
    }
  }

  function confirmDeleteTrack(track: Track) {
    setQueueTrackDialog(null);
    Alert.alert(
      'Eliminar del dispositivo',
      `Se eliminará “${track.title}” del almacenamiento del dispositivo. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTrack(track);
          },
        },
      ],
    );
  }

  async function deleteTrack(track: Track) {
    if (deletingTrackId !== null || queueOperationInProgress.current) {
      setErrorMessage(
        'Espera a que termine la acción actual antes de eliminar.',
      );
      return;
    }

    setDeletingTrackId(track.id);
    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      if (Number(Platform.Version) < 29) {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Permiso para eliminar música',
            message:
              'Mi Música necesita permiso para eliminar este archivo del dispositivo.',
            buttonPositive: 'Permitir',
            buttonNegative: 'Cancelar',
          },
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('No se concedió permiso para eliminar la canción.');
        }
      }

      const deleted = await deleteTrackFromDevice(track.id);
      if (!deleted) {
        return;
      }

      setTracks(current => current.filter(item => item.id !== track.id));
      setFavoriteIds(current => {
        const updated = new Set(current);
        updated.delete(track.id);
        return updated;
      });
      setPlaylists(current =>
        current.map(playlist => ({
          ...playlist,
          trackIds: playlist.trackIds.filter(id => id !== track.id),
        })),
      );
      setRecentPlayback(current =>
        current.filter(entry => entry.trackId !== track.id),
      );
      setErrorMessage(null);

      let queueCleanupError: string | null = null;
      if (playerReady) {
        try {
          const nativeQueue = await getPlayerQueue();
          const indexesToRemove = nativeQueue
            .map((item, index) => (String(item.id) === track.id ? index : -1))
            .filter(index => index >= 0)
            .sort((left, right) => right - left);
          if (indexesToRemove.length > 0 && activeTrack?.id === track.id) {
            await pausePlayer();
          }
          for (const index of indexesToRemove) {
            await removePlayerTrack(index);
          }
        } catch (error) {
          queueCleanupError =
            error instanceof Error
              ? `La canción se eliminó, pero no se pudo actualizar la cola: ${error.message}`
              : 'La canción se eliminó, pero no se pudo actualizar la cola.';
        }
      }

      originalQueueOrder.current = originalQueueOrder.current.filter(
        item => item.id !== track.id,
      );
      setPlaybackQueue(current => current.filter(item => item.id !== track.id));
      await loadLibrary(false);
      if (queueCleanupError) {
        setErrorMessage(queueCleanupError);
      } else {
        showQueueNotice(`“${track.title}” se eliminó del dispositivo.`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message.startsWith('La canción se eliminó')
            ? error.message
            : `No se pudo completar la eliminación: ${error.message}`
          : 'No se pudo completar la eliminación de la canción.',
      );
      loadLibrary(false);
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
      setDeletingTrackId(null);
    }
  }

  async function seekToPosition(position: number) {
    try {
      await seekPlayerTo(position);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo cambiar la posición: ${error.message}`
          : 'No se pudo cambiar la posición.',
      );
    }
  }

  async function changePlaybackRate() {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextRate = playbackRates[(currentIndex + 1) % playbackRates.length];
    let rateWasApplied = false;
    try {
      await setPlayerRate(nextRate);
      rateWasApplied = true;
      await persistPlaybackRate(nextRate);
      setPlaybackRate(nextRate);
      setErrorMessage(null);
    } catch (error) {
      let detail =
        error instanceof Error ? error.message : 'Error desconocido.';
      if (rateWasApplied) {
        try {
          await setPlayerRate(playbackRate);
        } catch (rollbackError) {
          const rollbackMessage =
            rollbackError instanceof Error
              ? rollbackError.message
              : 'Error desconocido.';
          detail = `${detail} No se pudo restaurar la velocidad anterior: ${rollbackMessage}`;
        }
      }
      setErrorMessage(`No se pudo cambiar la velocidad: ${detail}`);
    }
  }

  function updateEqualizerSettings(next: EqualizerSettings) {
    setEqualizerSettings(next);
    equalizerWriteChain.current = equalizerWriteChain.current
      .catch(() => undefined)
      .then(() => persistEqualizerSettings(next.enabled, next.bandGainsDb))
      .catch(error => {
        setErrorMessage(
          error instanceof Error
            ? `No se pudo guardar el ecualizador: ${error.message}`
            : 'No se pudo guardar la configuración del ecualizador.',
        );
      });
  }

  function changeEqualizerBand(index: number, gain: number) {
    const bandGainsDb = [...equalizerSettings.bandGainsDb];
    if (bandGainsDb[index] === gain) {
      return;
    }
    bandGainsDb[index] = gain;
    updateEqualizerSettings({ ...equalizerSettings, bandGainsDb });
  }

  async function clearRecentPlayback() {
    Alert.alert(
      'Borrar historial',
      'Se eliminará el historial de reproducción reciente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            clearPlaybackHistory()
              .then(() => setRecentPlayback([]))
              .catch(error => {
                setErrorMessage(
                  error instanceof Error
                    ? `No se pudo borrar el historial: ${error.message}`
                    : 'No se pudo borrar el historial de reproducción.',
                );
              });
          },
        },
      ],
    );
  }

  async function playTracks(
    queueTracks: Track[],
    track: Track,
    sourceLabel = 'Tu biblioteca',
  ) {
    if (!playerReady) {
      setErrorMessage('El reproductor todavía se está preparando.');
      return;
    }

    const queue = shuffleEnabled
      ? [
          track,
          ...shuffleTracks(queueTracks.filter(item => item.id !== track.id)),
        ]
      : [...queueTracks];
    const selectedIndex = queue.findIndex(item => item.id === track.id);
    if (selectedIndex < 0) {
      setErrorMessage('No se pudo encontrar la canción en la lista actual.');
      return;
    }

    try {
      originalQueueOrder.current = [...queueTracks];
      setPlaybackSourceLabel(sourceLabel);
      setPlaybackQueue(queue);
      await replacePlayerQueue(queue, selectedIndex);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo reproducir la canción: ${error.message}`
          : 'No se pudo reproducir la canción.',
      );
    }
  }

  async function playPlaylist(playlist: Playlist, startingTrack?: Track) {
    const tracksById = new Map(tracks.map(track => [track.id, track]));
    const playlistTracksToPlay = playlist.trackIds
      .map(trackId => tracksById.get(trackId))
      .filter((track): track is Track => track !== undefined);
    if (playlistTracksToPlay.length === 0) {
      setErrorMessage(
        'Esta lista no tiene canciones disponibles para reproducir.',
      );
      return;
    }

    await playTracks(
      playlistTracksToPlay,
      startingTrack ?? playlistTracksToPlay[0],
      playlist.name,
    );
  }

  async function savePlaylistName() {
    if (!playlistNameDialog) {
      return;
    }
    const dialog = playlistNameDialog;
    const normalizedName = dialog.name.trim();
    if (!normalizedName) {
      setPlaylistDialogError('Escribe un nombre para la lista.');
      return;
    }

    setSavingPlaylist(true);
    setPlaylistDialogError(null);
    try {
      if (dialog.playlistId) {
        await renamePlaylist(dialog.playlistId, normalizedName);
      } else {
        const playlist = await createPlaylist(normalizedName);
        if (dialog.trackIds?.length) {
          await setPlaylistTracks(playlist.id, dialog.trackIds);
        }
        setSelectedPlaylistId(playlist.id);
        setActiveTab('playlists');
      }
      setPlaylists(await getPlaylists());
      if (!dialog.playlistId) {
        setSearch('');
      }
      setPlaylistNameDialog(null);
      setPlaylistDialogError(null);
      setErrorMessage(null);
    } catch (error) {
      setPlaylistDialogError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la lista de reproducción.',
      );
      setErrorMessage(
        error instanceof Error
          ? `No se pudo guardar la lista: ${error.message}`
          : 'No se pudo guardar la lista de reproducción.',
      );
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function confirmDeletePlaylist() {
    if (!playlistToDelete) {
      return;
    }

    setSavingPlaylist(true);
    setPlaylistDialogError(null);
    try {
      await deletePlaylist(playlistToDelete.id);
      setPlaylists(await getPlaylists());
      if (selectedPlaylistId === playlistToDelete.id) {
        setSelectedPlaylistId(null);
      }
      setPlaylistToDelete(null);
      setPlaylistDialogError(null);
      setErrorMessage(null);
    } catch (error) {
      setPlaylistDialogError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la lista de reproducción.',
      );
      setErrorMessage(
        error instanceof Error
          ? `No se pudo eliminar la lista: ${error.message}`
          : 'No se pudo eliminar la lista de reproducción.',
      );
    } finally {
      setSavingPlaylist(false);
    }
  }

  function openPlaylistTrackPicker(playlist: Playlist) {
    const availableTrackIds = new Set(tracks.map(track => track.id));
    setDraftPlaylistTrackIds(
      new Set(
        playlist.trackIds.filter(trackId => availableTrackIds.has(trackId)),
      ),
    );
    setPlaylistTrackSearch('');
    setPlaylistDialogError(null);
    setTrackPickerPlaylistId(playlist.id);
  }

  function toggleDraftPlaylistTrack(trackId: string) {
    setDraftPlaylistTrackIds(current => {
      const updated = new Set(current);
      if (updated.has(trackId)) {
        updated.delete(trackId);
      } else {
        updated.add(trackId);
      }
      return updated;
    });
  }

  async function savePlaylistTracks() {
    if (!trackPickerPlaylistId) {
      return;
    }
    setSavingPlaylist(true);
    setPlaylistDialogError(null);
    try {
      await setPlaylistTracks(
        trackPickerPlaylistId,
        Array.from(draftPlaylistTrackIds),
      );
      setPlaylists(await getPlaylists());
      setTrackPickerPlaylistId(null);
      setPlaylistDialogError(null);
      setErrorMessage(null);
    } catch (error) {
      setPlaylistDialogError(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar las canciones de la lista.',
      );
      setErrorMessage(
        error instanceof Error
          ? `No se pudieron guardar las canciones: ${error.message}`
          : 'No se pudieron guardar las canciones de la lista.',
      );
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function removeTrackFromPlaylist(trackId: string) {
    if (!selectedPlaylist || savingPlaylist) {
      return;
    }
    setSavingPlaylist(true);
    const updatedTrackIds = selectedPlaylist.trackIds.filter(
      id => id !== trackId,
    );
    try {
      await setPlaylistTracks(selectedPlaylist.id, updatedTrackIds);
      setPlaylists(current =>
        current.map(playlist =>
          playlist.id === selectedPlaylist.id
            ? { ...playlist, trackIds: updatedTrackIds }
            : playlist,
        ),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo quitar la canción: ${error.message}`
          : 'No se pudo quitar la canción de la lista.',
      );
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function movePlaylistTrack(fromIndex: number, toIndex: number) {
    if (!selectedPlaylist || savingPlaylist) {
      return;
    }
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= selectedPlaylist.trackIds.length ||
      toIndex >= selectedPlaylist.trackIds.length
    ) {
      return;
    }
    const updatedTrackIds = [...selectedPlaylist.trackIds];
    const [movedTrackId] = updatedTrackIds.splice(fromIndex, 1);
    updatedTrackIds.splice(toIndex, 0, movedTrackId);
    setSavingPlaylist(true);
    try {
      await setPlaylistTracks(selectedPlaylist.id, updatedTrackIds);
      setPlaylists(current =>
        current.map(playlist =>
          playlist.id === selectedPlaylist.id
            ? { ...playlist, trackIds: updatedTrackIds }
            : playlist,
        ),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo cambiar el orden: ${error.message}`
          : 'No se pudo cambiar el orden de la lista.',
      );
    } finally {
      setSavingPlaylist(false);
    }
  }

  function saveQueueAsPlaylist() {
    if (playbackQueue.length === 0) {
      return;
    }
    setQueueVisible(false);
    setPlayerExpanded(false);
    setPlaylistDialogError(null);
    setPlaylistNameDialog({
      playlistId: null,
      name: '',
      trackIds: playbackQueue.map(track => track.id),
    });
  }

  function confirmClearQueue() {
    Alert.alert(
      'Vaciar canciones siguientes',
      'La canción actual seguirá reproduciéndose; se quitarán las demás.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: () => {
            (async () => {
              if (!playerReady || queueOperationInProgress.current) {
                return;
              }
              queueOperationInProgress.current = true;
              setQueueUpdating(true);
              try {
                if (activeTrack) {
                  await removeUpcomingPlayerTracks();
                  originalQueueOrder.current = [currentTrack].filter(
                    (track): track is Track => track !== null,
                  );
                } else {
                  await resetPlayerQueue();
                  originalQueueOrder.current = [];
                }
                await refreshPlaybackQueue();
                showQueueNotice('Se quitaron las canciones siguientes.');
                setErrorMessage(null);
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? `No se pudo vaciar la cola: ${error.message}`
                    : 'No se pudo vaciar la cola de reproducción.',
                );
              } finally {
                queueOperationInProgress.current = false;
                setQueueUpdating(false);
              }
            })();
          },
        },
      ],
    );
  }

  async function togglePlayback() {
    try {
      if (isPlaying) {
        await pausePlayer();
      } else {
        await playPlayer();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo controlar la reproducción: ${error.message}`
          : 'No se pudo controlar la reproducción.',
      );
    }
  }

  async function skipTrack(direction: 'next' | 'previous') {
    try {
      if (direction === 'next') {
        await skipToNextPlayerTrack();
      } else {
        await skipToPreviousPlayerTrack();
      }
    } catch {
      setErrorMessage(
        direction === 'next'
          ? 'No hay una canción siguiente en la cola.'
          : 'No hay una canción anterior en la cola.',
      );
    }
  }

  async function cycleRepeatMode() {
    if (!playerReady) {
      return;
    }

    const nextMode =
      repeatMode === RepeatMode.Off
        ? RepeatMode.Track
        : repeatMode === RepeatMode.Track
        ? RepeatMode.Queue
        : RepeatMode.Off;

    try {
      await setPlayerRepeatMode(nextMode);
      setRepeatMode(nextMode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo cambiar la repetición: ${error.message}`
          : 'No se pudo cambiar la repetición.',
      );
    }
  }

  function showQueueNotice(message: string) {
    if (queueNoticeTimeout.current) {
      clearTimeout(queueNoticeTimeout.current);
    }
    setQueueNotice(message);
    queueNoticeTimeout.current = setTimeout(() => {
      setQueueNotice(null);
      queueNoticeTimeout.current = null;
    }, 2500);
  }

  async function applyUpcomingQueueOrder(
    targetQueue: Track[],
    firstMovableIndex: number,
  ) {
    const updatedQueue = [...playbackQueue];
    for (
      let targetIndex = firstMovableIndex;
      targetIndex < targetQueue.length;
      targetIndex += 1
    ) {
      const currentIndex = updatedQueue.findIndex(
        (track, index) =>
          index >= targetIndex && track.id === targetQueue[targetIndex].id,
      );
      if (currentIndex < 0) {
        throw new Error('No se pudo encontrar una canción en la cola.');
      }
      if (currentIndex !== targetIndex) {
        await movePlayerTrack(currentIndex, targetIndex);
        const [movedTrack] = updatedQueue.splice(currentIndex, 1);
        updatedQueue.splice(targetIndex, 0, movedTrack);
      }
    }
  }

  async function toggleShuffle() {
    if (!playerReady || queueOperationInProgress.current) {
      return;
    }

    const nextEnabled = !shuffleEnabled;
    const activeIndex = activeTrack
      ? playbackQueue.findIndex(track => track.id === activeTrack.id)
      : -1;
    const firstMovableIndex = Math.max(0, activeIndex + 1);
    const targetQueue = nextEnabled
      ? shuffleUpcomingTracks(playbackQueue, activeTrack?.id ?? '')
      : restoreUpcomingTrackOrder(
          playbackQueue,
          originalQueueOrder.current,
          activeTrack?.id ?? '',
        );

    if (nextEnabled) {
      originalQueueOrder.current = [...playbackQueue];
    }

    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      await applyUpcomingQueueOrder(targetQueue, firstMovableIndex);
      await refreshPlaybackQueue();
      setShuffleEnabled(nextEnabled);
      setErrorMessage(null);
    } catch (error) {
      let message =
        error instanceof Error
          ? `No se pudo cambiar la mezcla: ${error.message}`
          : 'No se pudo cambiar el orden aleatorio de la cola.';
      try {
        await refreshPlaybackQueue();
      } catch (refreshError) {
        const detail =
          refreshError instanceof Error
            ? refreshError.message
            : 'No se pudo recuperar el estado de la cola.';
        message = `${message} ${detail}`;
      }
      setErrorMessage(message);
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  async function addTrackToQueue(track: Track, placement: 'next' | 'end') {
    setQueueTrackDialog(null);
    if (!playerReady || queueOperationInProgress.current) {
      return;
    }

    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      const nativeQueue = await getPlayerQueue();
      const tracksById = new Map(tracks.map(item => [item.id, item]));
      const currentQueue = nativeQueue
        .map(item => tracksById.get(String(item.id)))
        .filter((item): item is Track => item !== undefined);
      const activeIndex =
        (await getActivePlayerTrackIndex()) ??
        currentQueue.findIndex(item => item.id === activeTrack?.id);
      const existingIndex = currentQueue.findIndex(
        item => item.id === track.id,
      );

      if (existingIndex >= 0) {
        if (placement === 'next' && existingIndex !== activeIndex) {
          const targetIndex = Math.max(0, activeIndex + 1);
          if (existingIndex !== targetIndex) {
            await movePlayerTrack(existingIndex, targetIndex);
            const [existingTrack] = currentQueue.splice(existingIndex, 1);
            currentQueue.splice(targetIndex, 0, existingTrack);
            if (shuffleEnabled) {
              originalQueueOrder.current = [...currentQueue];
            }
            await refreshPlaybackQueue();
            showQueueNotice(`${track.title} se reproducirá a continuación.`);
          } else {
            showQueueNotice(`${track.title} ya está a continuación.`);
          }
        } else {
          showQueueNotice(
            existingIndex === activeIndex
              ? `${track.title} ya se está reproduciendo.`
              : `${track.title} ya está en la cola.`,
          );
        }
        return;
      }

      if (currentQueue.length === 0) {
        await playTracks([track], track, 'Cola de reproducción');
        showQueueNotice(`${track.title} empezó a reproducirse.`);
        return;
      }

      const insertIndex =
        placement === 'next'
          ? Math.max(0, Math.min(activeIndex + 1, currentQueue.length))
          : currentQueue.length;
      await addPlayerTrack(track, insertIndex);

      const updatedQueue = [...currentQueue];
      updatedQueue.splice(insertIndex, 0, track);
      const originalIndex =
        placement === 'end'
          ? originalQueueOrder.current.length
          : Math.max(
              0,
              originalQueueOrder.current.findIndex(
                item => item.id === activeTrack?.id,
              ) + 1,
            );
      originalQueueOrder.current.splice(originalIndex, 0, track);
      setPlaybackQueue(updatedQueue);
      await refreshPlaybackQueue();
      showQueueNotice(
        placement === 'next'
          ? `${track.title} se reproducirá a continuación.`
          : `${track.title} se añadió al final de la cola.`,
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo añadir la canción a la cola: ${error.message}`
          : 'No se pudo añadir la canción a la cola.',
      );
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  function stopSleepTimer() {
    if (sleepTimerTimeout.current) {
      clearTimeout(sleepTimerTimeout.current);
      sleepTimerTimeout.current = null;
    }
    if (sleepTimerInterval.current) {
      clearInterval(sleepTimerInterval.current);
      sleepTimerInterval.current = null;
    }
    sleepTimerDeadlineRef.current = null;
    setSleepTimerDeadline(null);
    setSleepTimerSecondsLeft(0);
  }

  async function expireSleepTimer() {
    stopSleepTimer();
    try {
      await pausePlayer();
      showQueueNotice('Temporizador finalizado. Reproducción pausada.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo pausar al finalizar el temporizador: ${error.message}`
          : 'No se pudo pausar la reproducción al finalizar el temporizador.',
      );
    }
  }

  function startSleepTimer(minutes: number) {
    stopSleepTimer();
    const deadline = Date.now() + minutes * 60 * 1000;
    sleepTimerDeadlineRef.current = deadline;
    setSleepTimerDeadline(deadline);
    setSleepTimerSecondsLeft(minutes * 60);
    sleepTimerTimeout.current = setTimeout(
      () => expireSleepTimerRef.current(),
      minutes * 60 * 1000,
    );
    sleepTimerInterval.current = setInterval(() => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      );
      setSleepTimerSecondsLeft(remainingSeconds);
      if (remainingSeconds === 0) {
        expireSleepTimerRef.current();
      }
    }, 1000);
    setSleepTimerVisible(false);
  }

  expireSleepTimerRef.current = expireSleepTimer;

  function navigateTo(itemId: LibraryTab | 'favorites') {
    setPrimaryScreen('library');
    setSelectedGroup(null);
    if (itemId === 'favorites') {
      setSelectedPlaylistId(null);
      setActiveTab('songs');
      setLibraryFilter('favorites');
      return;
    }

    if (itemId === 'playlists' && activeTab === 'playlists') {
      setSelectedPlaylistId(null);
      setSearch('');
      return;
    }

    setSelectedPlaylistId(null);
    setActiveTab(itemId);
    setLibraryFilter('all');
  }

  function navigateToPrimaryScreen(screen: 'home' | 'search' | 'library') {
    setPrimaryScreen(screen);
    setSearch('');
    if (screen === 'search') {
      setSelectedGroup(null);
      setSelectedPlaylistId(null);
      setActiveTab('songs');
      setLibraryFilter('all');
      setSelectedGenre(null);
    } else if (screen === 'library') {
      setSelectedGroup(null);
      setSelectedPlaylistId(null);
      setSearch('');
    }
  }

  async function playQueueTrack(index: number) {
    try {
      await skipToPlayerTrack(index);
      await playPlayer();
      setQueueVisible(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo reproducir desde la cola: ${error.message}`
          : 'No se pudo reproducir esa canción de la cola.',
      );
    }
  }

  async function refreshPlaybackQueue() {
    const queue = await getPlayerQueue();
    const tracksById = new Map(tracks.map(track => [track.id, track]));
    setPlaybackQueue(
      queue
        .map(item => tracksById.get(String(item.id)))
        .filter((track): track is Track => track !== undefined),
    );
  }

  function clearQueueUndoTimers() {
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
      undoTimeout.current = null;
    }
    if (undoInterval.current) {
      clearInterval(undoInterval.current);
      undoInterval.current = null;
    }
  }

  function showQueueUndo(removal: PendingQueueRemoval) {
    clearQueueUndoTimers();
    setPendingQueueRemoval(removal);
    setUndoSecondsLeft(3);
    undoTimeout.current = setTimeout(() => {
      setPendingQueueRemoval(null);
      setUndoSecondsLeft(0);
      undoTimeout.current = null;
      if (undoInterval.current) {
        clearInterval(undoInterval.current);
        undoInterval.current = null;
      }
    }, 3000);
    undoInterval.current = setInterval(() => {
      setUndoSecondsLeft(seconds => Math.max(1, seconds - 1));
    }, 1000);
  }

  async function moveQueueTrack(fromIndex: number, toIndex: number) {
    if (
      queueOperationInProgress.current ||
      toIndex < 0 ||
      toIndex >= playbackQueue.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const previousQueue = playbackQueue;
    const nextQueue = [...playbackQueue];
    const [movedTrack] = nextQueue.splice(fromIndex, 1);
    nextQueue.splice(toIndex, 0, movedTrack);

    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    setPlaybackQueue(nextQueue);
    try {
      await movePlayerTrack(fromIndex, toIndex);
      if (shuffleEnabled) {
        originalQueueOrder.current = [...nextQueue];
      }
      await refreshPlaybackQueue();
      setErrorMessage(null);
    } catch (error) {
      setPlaybackQueue(previousQueue);
      setErrorMessage(
        error instanceof Error
          ? `No se pudo reordenar la cola: ${error.message}`
          : 'No se pudo reordenar la cola.',
      );
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  function getQueueScrollOffset() {
    return queueScrollOffset.current;
  }

  function measureQueueViewport() {
    queueViewportRef.current?.measureInWindow((_x, top, _width, height) => {
      queueScrollViewport.current = { top, height };
    });
  }

  function updateQueueDrag(
    trackId: string | null,
    targetIndex: number | null,
    pointerY?: number,
  ) {
    setDraggingTrackId(current => (current === trackId ? current : trackId));
    setDragTargetIndex(current =>
      current === targetIndex ? current : targetIndex,
    );

    if (trackId === null || pointerY === undefined) {
      return;
    }

    const now = Date.now();
    if (now - lastQueueAutoScrollAt.current < 40) {
      return;
    }

    const { top, height } = queueScrollViewport.current;
    if (height <= 0) {
      return;
    }

    const edgeSize = 56;
    const maxOffset = Math.max(0, queueScrollContentHeight.current - height);
    let nextOffset = queueScrollOffset.current;
    if (pointerY < top + edgeSize) {
      nextOffset = Math.max(0, nextOffset - 12);
    } else if (pointerY > top + height - edgeSize) {
      nextOffset = Math.min(maxOffset, nextOffset + 12);
    }

    if (nextOffset !== queueScrollOffset.current) {
      lastQueueAutoScrollAt.current = now;
      queueScrollOffset.current = nextOffset;
      queueScrollRef.current?.scrollToOffset({
        offset: nextOffset,
        animated: false,
      });
    }
  }

  async function removeQueueTrack(
    track: Track,
    index: number,
  ): Promise<boolean> {
    if (
      queueOperationInProgress.current ||
      playbackQueue[index]?.id !== track.id
    ) {
      return false;
    }

    const removal: PendingQueueRemoval = {
      track,
      index,
      wasCurrent: activeTrack?.id === track.id,
      wasPlaying: isPlaying,
      position: playbackPosition.current,
      originalIndex: originalQueueOrder.current.findIndex(
        item => item.id === track.id,
      ),
      nextTrackId:
        playbackQueue[index + 1]?.id ??
        (activeTrack?.id === track.id
          ? playbackQueue[0]?.id
          : playbackQueue[index - 1]?.id) ??
        null,
    };
    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      await removePlayerTrack(index);
      originalQueueOrder.current = originalQueueOrder.current.filter(
        item => item.id !== track.id,
      );
      await refreshPlaybackQueue();
      showQueueUndo(removal);
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo quitar la canción de la cola: ${error.message}`
          : 'No se pudo quitar la canción de la cola.',
      );
      return false;
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  async function undoQueueRemoval() {
    const removal = pendingQueueRemoval;
    if (!removal || queueOperationInProgress.current) {
      return;
    }

    clearQueueUndoTimers();
    setPendingQueueRemoval(null);
    setUndoSecondsLeft(0);
    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      await addPlayerTrack(
        removal.track,
        Math.min(removal.index, playbackQueue.length),
      );
      originalQueueOrder.current.splice(
        Math.min(
          removal.originalIndex >= 0 ? removal.originalIndex : removal.index,
          originalQueueOrder.current.length,
        ),
        0,
        removal.track,
      );
      if (
        removal.wasCurrent &&
        (activeTrack?.id === removal.nextTrackId || !removal.nextTrackId)
      ) {
        await skipToPlayerTrack(removal.index);
        await seekPlayerTo(removal.position);
        if (removal.wasPlaying) {
          await playPlayer();
        } else {
          await pausePlayer();
        }
      }
      await refreshPlaybackQueue();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo deshacer la eliminación: ${error.message}`
          : 'No se pudo deshacer la eliminación.',
      );
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  function renderTrack(
    track: Track,
    _index: number,
    queueTracks: Track[] = visibleTracks,
    sourceLabel = 'Tu biblioteca',
    fromLibrary = true,
  ) {
    const isCurrent = currentTrack?.id === track.id;
    return (
      <FavoriteSwipeRow
        key={track.id}
        isFavorite={favoriteIds.has(track.id)}
        onToggleFavorite={() => toggleFavorite(track)}
        trackTitle={track.title}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reproducir ${track.title} de ${track.artist}`}
          accessibilityState={{ selected: isCurrent }}
          android_ripple={{ color: colors.ripple }}
          onPress={() => playTracks(queueTracks, track, sourceLabel)}
          style={styles.trackMain}
        >
          {isCurrent ? (
            <CurrentTrackIndicator isPlaying={isPlaying} />
          ) : (
            <Artwork uri={track.artwork} size={56} />
          )}
          <View style={styles.trackDetails}>
            <Text
              numberOfLines={1}
              style={[styles.trackTitle, isCurrent && styles.currentTrackTitle]}
            >
              {track.title}
            </Text>
            <Text numberOfLines={1} style={styles.trackSubtitle}>
              {track.artist}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Más acciones para ${track.title}`}
          onPress={() => setQueueTrackDialog({ track, fromLibrary })}
          style={styles.trackMoreButton}
        >
          <MoreVertical color={colors.muted} size={24} strokeWidth={2} />
        </Pressable>
      </FavoriteSwipeRow>
    );
  }

  function renderGroupedLibrary(group: GroupedLibraryItem) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${
          activeTab === 'albums' ? 'álbum' : 'artista'
        } ${group.name}`}
        android_ripple={{ color: colors.ripple }}
        onPress={() => {
          const allGroupTracks = tracks.filter(track => {
            const identity =
              activeTab === 'albums'
                ? track.albumId && track.albumId !== '0'
                  ? track.albumId
                  : `${track.album}\u0000${track.artist}`
                : track.artist.toLocaleLowerCase();
            return `${activeTab}:${identity}` === group.key;
          });
          setSelectedGroup({
            kind: activeTab === 'albums' ? 'album' : 'artist',
            name: group.name,
            tracks: allGroupTracks,
          });
          setSearch('');
        }}
        style={styles.groupRow}
      >
        <Artwork uri={group.tracks[0].artwork} size={56} />
        <View style={styles.trackDetails}>
          <Text numberOfLines={1} style={styles.trackTitle}>
            {group.name}
          </Text>
          <Text style={styles.trackSubtitle}>
            {activeTab === 'albums'
              ? `${group.tracks[0].artist} · ${formatTrackCount(
                  group.tracks.length,
                )}`
              : formatTrackCount(group.tracks.length)}
          </Text>
        </View>
        <Text style={styles.groupPlay}>›</Text>
      </Pressable>
    );
  }

  function renderPlaylistCard(playlist: Playlist) {
    const availableTracks = playlistTracksById.get(playlist.id) ?? [];
    const firstTrack = availableTracks[0];
    return (
      <View style={styles.playlistCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir lista ${playlist.name}, ${formatTrackCount(
            availableTracks.length,
          )}`}
          android_ripple={{ color: colors.ripple }}
          onPress={() => {
            setSelectedPlaylistId(playlist.id);
            setSearch('');
          }}
          style={styles.playlistCardMain}
        >
          <Artwork uri={firstTrack?.artwork} size={56} />
          <View style={styles.trackDetails}>
            <Text numberOfLines={1} style={styles.trackTitle}>
              {playlist.name}
            </Text>
            <Text style={styles.trackSubtitle}>
              {formatTrackCount(availableTracks.length)}
            </Text>
          </View>
          <Text style={styles.groupPlay}>›</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Renombrar ${playlist.name}`}
          onPress={() => {
            setPlaylistDialogError(null);
            setPlaylistNameDialog({
              playlistId: playlist.id,
              name: playlist.name,
            });
          }}
          style={styles.playlistActionButton}
        >
          <Text style={styles.playlistActionIcon}>✎</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${playlist.name}`}
          onPress={() => setPlaylistToDelete(playlist)}
          style={styles.playlistActionButton}
        >
          <Text style={styles.playlistDeleteIcon}>×</Text>
        </Pressable>
      </View>
    );
  }

  function renderPlaylistTrack(track: Track) {
    const orderIndex = selectedPlaylist?.trackIds.indexOf(track.id) ?? -1;
    return (
      <PlaylistTrackRow
        disabled={savingPlaylist || orderIndex < 0}
        index={orderIndex}
        onMove={movePlaylistTrack}
        title={track.title}
        trackCount={selectedPlaylist?.trackIds.length ?? 0}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reproducir ${track.title} de ${track.artist} desde ${selectedPlaylist?.name}`}
          onPress={() => playPlaylist(selectedPlaylist!, track)}
          style={styles.trackMain}
        >
          <Artwork uri={track.artwork} size={48} />
          <View style={styles.trackDetails}>
            <Text numberOfLines={1} style={styles.trackTitle}>
              {track.title}
            </Text>
            <Text numberOfLines={1} style={styles.trackSubtitle}>
              {track.artist} · {track.album}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${track.title} de ${selectedPlaylist?.name}`}
          accessibilityState={{ disabled: savingPlaylist }}
          disabled={savingPlaylist}
          hitSlop={6}
          onPress={() => removeTrackFromPlaylist(track.id)}
          style={styles.playlistRemoveButton}
        >
          <Text style={styles.playlistRemoveIcon}>−</Text>
        </Pressable>
      </PlaylistTrackRow>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={
          colors.background === darkDesignTokens.colors.background
            ? 'light-content'
            : 'dark-content'
        }
      />
      <Animated.View
        style={[
          styles.screenContent,
          {
            opacity: screenTransitionProgress,
            transform: [
              {
                translateY: screenTransitionProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        {primaryScreen === 'home' ? (
          <HomeScreen
            colors={colors}
            styles={styles}
            safeAreaTop={safeAreaInsets.top}
            tracks={tracks}
            playlists={playlists}
            currentTrack={currentTrack}
            recentTracks={homeRecentTracks}
            addedTracks={homeAddedTracks}
            favoriteIds={favoriteIds}
            loadingLibrary={loadingLibrary}
            errorMessage={errorMessage}
            errorRetryAction={errorRetryAction}
            queueNotice={queueNotice}
            loadLibrary={loadLibrary}
            navigateTo={navigateTo}
            navigateToPrimaryScreen={navigateToPrimaryScreen}
            setPlayerExpanded={setPlayerExpanded}
            playTracks={playTracks}
            renderTrack={renderTrack}
          />
        ) : primaryScreen === 'search' ? (
          <SearchScreen
            colors={colors}
            styles={styles}
            scrollY={libraryScrollY}
            scrollRef={libraryScrollRef}
            query={search}
            onQueryChange={setSearch}
            tracks={visibleTracks}
            loading={loadingLibrary}
            errorMessage={errorMessage}
            errorRetryAction={errorRetryAction}
            queueNotice={queueNotice}
            onRefresh={loadLibrary}
            renderTrack={(track, index, queueTracks) =>
              renderTrack(track, index, queueTracks, 'Biblioteca')
            }
          />
        ) : (
          <LibraryScreen
            colors={colors}
            styles={styles}
            libraryScrollY={libraryScrollY}
            libraryScrollRef={libraryScrollRef}
            selectedGroup={selectedGroup}
            selectedPlaylist={selectedPlaylist}
            activeTab={activeTab}
            activeNavigationItem={activeNavigationItem}
            libraryFilter={libraryFilter}
            trackSort={trackSort}
            selectedGenre={selectedGenre}
            search={search}
            loadingLibrary={loadingLibrary}
            loadingPlaylists={loadingPlaylists}
            playerReady={playerReady}
            errorMessage={errorMessage}
            errorRetryAction={errorRetryAction}
            queueNotice={queueNotice}
            recentPlayback={recentPlayback}
            recentTracks={recentTracks}
            visibleTracks={visibleTracks}
            visibleSelectedGroupTracks={visibleSelectedGroupTracks}
            playlistTracks={playlistTracks}
            visiblePlaylistTracks={visiblePlaylistTracks}
            visiblePlaylists={visiblePlaylists}
            groupedLibrary={groupedLibrary}
            librarySections={librarySections}
            trackSorts={trackSorts}
            setSelectedGroup={setSelectedGroup}
            setSelectedPlaylistId={setSelectedPlaylistId}
            setSearch={setSearch}
            setPlaylistDialogError={setPlaylistDialogError}
            setPlaylistNameDialog={setPlaylistNameDialog}
            setTrackSort={setTrackSort}
            setFiltersVisible={setFiltersVisible}
            setSelectedGenre={setSelectedGenre}
            navigateTo={navigateTo}
            playTracks={playTracks}
            playPlaylist={playPlaylist}
            openPlaylistTrackPicker={openPlaylistTrackPicker}
            clearRecentPlayback={clearRecentPlayback}
            loadLibrary={loadLibrary}
            renderTrack={renderTrack}
            renderGroupedLibrary={renderGroupedLibrary}
            renderPlaylistCard={renderPlaylistCard}
            renderPlaylistTrack={renderPlaylistTrack}
          />
        )}
      </Animated.View>

      {currentTrack ? (
        <View style={styles.miniPlayer}>
          <MiniPlayerProgress
            duration={currentTrack.duration}
            onPositionChange={rememberPlaybackPosition}
          />
          <View style={styles.miniPlayerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir reproductor: ${currentTrack.title} de ${currentTrack.artist}`}
              android_ripple={{ color: colors.ripple }}
              onPress={() => setPlayerExpanded(true)}
              style={styles.miniTrackInfo}
            >
              <Artwork uri={currentTrack.artwork} size={44} />
              <View style={styles.nowPlayingDetails}>
                <Text numberOfLines={1} style={styles.nowPlayingTitle}>
                  {currentTrack.title}
                </Text>
                <Text numberOfLines={1} style={styles.trackSubtitle}>
                  {currentTrack.artist}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
              onPress={togglePlayback}
              style={styles.playButton}
            >
              {isPlaying ? (
                <View style={styles.pauseIcon}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <Play
                  color={colors.onAccent}
                  fill={colors.onAccent}
                  size={20}
                />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Siguiente canción"
              onPress={() => skipTrack('next')}
              style={styles.miniNextButton}
            >
              <SkipForward color={colors.text} size={22} />
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.bottomNavigation}>
        {navigationItems.map(item => {
          const selected = primaryScreen === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => navigateToPrimaryScreen(item.id)}
              style={[
                styles.navigationItem,
                selected && styles.navigationItemSelected,
              ]}
            >
              <Animated.View
                style={[
                  styles.navigationIconContainer,
                  selected && { transform: [{ scale: navigationScale }] },
                ]}
              >
                <item.icon
                  color={selected ? colors.onAccent : colors.muted}
                  fill={selected ? colors.onAccent : 'none'}
                  size={21}
                  strokeWidth={2}
                />
              </Animated.View>
              {selected ? (
                <Text numberOfLines={1} style={styles.navigationLabelSelected}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <PlayerScreen
        colors={colors}
        styles={styles}
        currentTrack={currentTrack}
        expandedArtworkSize={expandedArtworkSize}
        playerExpanded={playerExpanded}
        setPlayerExpanded={setPlayerExpanded}
        playbackSourceLabel={playbackSourceLabel}
        favoriteIds={favoriteIds}
        toggleFavorite={toggleFavorite}
        seekToPosition={seekToPosition}
        playerReady={playerReady}
        shuffleEnabled={shuffleEnabled}
        queueUpdating={queueUpdating}
        toggleShuffle={toggleShuffle}
        skipTrack={skipTrack}
        isPlaying={isPlaying}
        togglePlayback={togglePlayback}
        repeatMode={repeatMode}
        cycleRepeatMode={cycleRepeatMode}
        playbackQueue={playbackQueue}
        queueVisible={queueVisible}
        setQueueVisible={setQueueVisible}
        sleepTimerVisible={sleepTimerVisible}
        setSleepTimerVisible={setSleepTimerVisible}
        sleepTimerDeadline={sleepTimerDeadline}
        sleepTimerSecondsLeft={sleepTimerSecondsLeft}
        playbackRate={playbackRate}
        changePlaybackRate={changePlaybackRate}
        equalizerVisible={equalizerVisible}
        setEqualizerVisible={setEqualizerVisible}
        equalizerSettings={equalizerSettings}
        updateEqualizerSettings={updateEqualizerSettings}
        changeEqualizerBand={changeEqualizerBand}
        saveQueueAsPlaylist={saveQueueAsPlaylist}
        confirmClearQueue={confirmClearQueue}
        queueViewportRef={queueViewportRef}
        measureQueueViewport={measureQueueViewport}
        queueScrollRef={queueScrollRef}
        queueScrollContentHeight={queueScrollContentHeight}
        queueScrollOffset={queueScrollOffset}
        getQueueScrollOffset={getQueueScrollOffset}
        dragTargetIndex={dragTargetIndex}
        draggingTrackId={draggingTrackId}
        playQueueTrack={playQueueTrack}
        moveQueueTrack={moveQueueTrack}
        updateQueueDrag={updateQueueDrag}
        removeQueueTrack={removeQueueTrack}
        pendingQueueRemoval={pendingQueueRemoval}
        undoSecondsLeft={undoSecondsLeft}
        undoQueueRemoval={undoQueueRemoval}
        startSleepTimer={startSleepTimer}
        stopSleepTimer={stopSleepTimer}
      />
      <Modal
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
        transparent
        visible={filtersVisible}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar filtros"
            onPress={() => setFiltersVisible(false)}
            style={styles.sheetBackdrop}
          />
          <View
            style={[
              styles.filterSheet,
              { paddingBottom: Math.max(24, safeAreaInsets.bottom + 16) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Filtros</Text>
                <Text style={styles.sheetSubtitle}>Género musical</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar filtros"
                onPress={() => setFiltersVisible(false)}
                style={styles.sheetCloseButton}
              >
                <X color={colors.text} size={22} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.filterSheetScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.filterSectionTitle}>Género</Text>
              <View style={styles.filterChoiceGrid}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedGenre === null }}
                  onPress={() => setSelectedGenre(null)}
                  style={[
                    styles.filterChoice,
                    selectedGenre === null && styles.filterChoiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChoiceText,
                      selectedGenre === null && styles.filterChoiceTextSelected,
                    ]}
                  >
                    Todos
                  </Text>
                </Pressable>
                {availableGenres.map(genre => {
                  const selected = selectedGenre === genre;
                  return (
                    <Pressable
                      key={genre}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setSelectedGenre(selected ? null : genre)}
                      style={[
                        styles.filterChoice,
                        selected && styles.filterChoiceSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChoiceText,
                          selected && styles.filterChoiceTextSelected,
                        ]}
                      >
                        {genre}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.filterSheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedGenre(null)}
                style={styles.filterClearButton}
              >
                <Text style={styles.filterClearText}>Limpiar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersVisible(false)}
                style={styles.filterApplyButton}
              >
                <Text style={styles.filterApplyText}>
                  Ver {formatTrackCount(visibleTracks.length)}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setPlaylistNameDialog(null);
          setPlaylistDialogError(null);
        }}
        transparent
        visible={playlistNameDialog !== null}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>
              {playlistNameDialog?.playlistId
                ? 'Renombrar lista'
                : 'Crear lista'}
            </Text>
            <TextInput
              accessibilityLabel="Nombre de la lista"
              autoFocus
              maxLength={60}
              onChangeText={name =>
                setPlaylistNameDialog(current =>
                  current ? { ...current, name } : current,
                )
              }
              onSubmitEditing={savePlaylistName}
              placeholder="Nombre de la lista"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={styles.dialogInput}
              value={playlistNameDialog?.name ?? ''}
            />
            {playlistDialogError ? (
              <Text style={styles.dialogError}>{playlistDialogError}</Text>
            ) : null}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                disabled={savingPlaylist}
                onPress={() => {
                  setPlaylistNameDialog(null);
                  setPlaylistDialogError(null);
                }}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  playlistNameDialog?.playlistId
                    ? 'Guardar nombre de la lista'
                    : 'Crear lista'
                }
                disabled={savingPlaylist}
                onPress={savePlaylistName}
                style={styles.dialogConfirmButton}
              >
                <Text style={styles.dialogConfirmText}>
                  {savingPlaylist ? 'Guardando…' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setQueueTrackDialog(null)}
        transparent
        visible={queueTrackDialog !== null}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text numberOfLines={1} style={styles.dialogTitle}>
              {queueTrackDialog?.track.title}
            </Text>
            <Text numberOfLines={1} style={styles.dialogDescription}>
              {queueTrackDialog
                ? `${queueTrackDialog.track.artist} · ${formatTime(
                    queueTrackDialog.track.duration,
                  )}`
                : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: queueTrackDialog
                  ? favoriteIds.has(queueTrackDialog.track.id)
                  : false,
              }}
              onPress={() => {
                if (queueTrackDialog) {
                  toggleFavorite(queueTrackDialog.track);
                }
              }}
              style={styles.queueMenuAction}
            >
              <Text style={styles.queueMenuActionText}>
                {queueTrackDialog && favoriteIds.has(queueTrackDialog.track.id)
                  ? '♥ Quitar de favoritas'
                  : '♡ Añadir a favoritas'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reproducir ${queueTrackDialog?.track.title} a continuación`}
              onPress={() => {
                if (queueTrackDialog) {
                  addTrackToQueue(queueTrackDialog.track, 'next');
                }
              }}
              style={styles.queueMenuAction}
            >
              <Text style={styles.queueMenuActionText}>
                ▶ Reproducir a continuación
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Añadir ${queueTrackDialog?.track.title} al final de la cola`}
              onPress={() => {
                if (queueTrackDialog) {
                  addTrackToQueue(queueTrackDialog.track, 'end');
                }
              }}
              style={styles.queueMenuAction}
            >
              <Text style={styles.queueMenuActionText}>
                + Añadir al final de la cola
              </Text>
            </Pressable>
            {queueTrackDialog?.fromLibrary ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${queueTrackDialog.track.title} del dispositivo`}
                accessibilityState={{
                  disabled:
                    deletingTrackId === queueTrackDialog.track.id ||
                    queueUpdating,
                }}
                disabled={
                  deletingTrackId === queueTrackDialog.track.id || queueUpdating
                }
                onPress={() => confirmDeleteTrack(queueTrackDialog.track)}
                style={styles.queueMenuAction}
              >
                <Text style={styles.queueMenuActionText}>
                  {deletingTrackId === queueTrackDialog.track.id
                    ? 'Eliminando…'
                    : '⌫ Eliminar del dispositivo'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setQueueTrackDialog(null)}
              style={styles.dialogCancelButton}
            >
              <Text style={styles.dialogCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setPlaylistToDelete(null);
          setPlaylistDialogError(null);
        }}
        transparent
        visible={playlistToDelete !== null}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Eliminar lista</Text>
            <Text style={styles.dialogDescription}>
              ¿Eliminar “{playlistToDelete?.name}”? Las canciones originales no
              se borrarán del dispositivo.
            </Text>
            {playlistDialogError ? (
              <Text style={styles.dialogError}>{playlistDialogError}</Text>
            ) : null}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                disabled={savingPlaylist}
                onPress={() => {
                  setPlaylistToDelete(null);
                  setPlaylistDialogError(null);
                }}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Confirmar eliminación de ${playlistToDelete?.name}`}
                disabled={savingPlaylist}
                onPress={confirmDeletePlaylist}
                style={styles.dialogDangerButton}
              >
                <Text style={styles.dialogConfirmText}>
                  {savingPlaylist ? 'Eliminando…' : 'Eliminar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => {
          setTrackPickerPlaylistId(null);
          setPlaylistDialogError(null);
        }}
        transparent
        visible={trackPickerPlaylistId !== null}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.trackPickerCard}>
            <View style={styles.trackPickerHeader}>
              <View style={styles.trackPickerHeading}>
                <Text style={styles.dialogTitle}>Añadir canciones</Text>
                <Text style={styles.dialogDescription}>
                  {draftPlaylistTrackIds.size} seleccionadas
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar selección de canciones"
                onPress={() => {
                  setTrackPickerPlaylistId(null);
                  setPlaylistDialogError(null);
                }}
                style={styles.queueCloseButton}
              >
                <Text style={styles.queueCloseIcon}>×</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Buscar canciones para añadir"
              onChangeText={setPlaylistTrackSearch}
              placeholder="Buscar canciones"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.dialogInput}
              value={playlistTrackSearch}
            />
            {playlistDialogError ? (
              <Text style={styles.dialogError}>{playlistDialogError}</Text>
            ) : null}
            {visiblePlaylistPickerTracks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {playlistTrackSearch
                    ? 'No encontramos resultados'
                    : 'No hay canciones disponibles'}
                </Text>
                <Text style={styles.emptyDescription}>
                  {playlistTrackSearch
                    ? 'Prueba con otro título, artista o álbum.'
                    : 'Añade audio al dispositivo y actualiza la biblioteca.'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.trackPickerList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {visiblePlaylistPickerTracks.map(track => {
                  const selected = draftPlaylistTrackIds.has(track.id);
                  return (
                    <Pressable
                      key={track.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${track.title} de ${track.artist}`}
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleDraftPlaylistTrack(track.id)}
                      style={styles.trackPickerRow}
                    >
                      <Artwork uri={track.artwork} size={44} />
                      <View style={styles.trackDetails}>
                        <Text numberOfLines={1} style={styles.trackTitle}>
                          {track.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.trackSubtitle}>
                          {track.artist} · {track.album}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.trackPickerCheckbox,
                          selected && styles.trackPickerCheckboxSelected,
                        ]}
                      >
                        <Text style={styles.trackPickerCheck}>
                          {selected ? '✓' : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                disabled={savingPlaylist}
                onPress={() => {
                  setTrackPickerPlaylistId(null);
                  setPlaylistDialogError(null);
                }}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Guardar canciones seleccionadas"
                disabled={savingPlaylist}
                onPress={savePlaylistTracks}
                style={styles.dialogConfirmButton}
              >
                <Text style={styles.dialogConfirmText}>
                  {savingPlaylist ? 'Guardando…' : 'Guardar selección'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App({
  initialScreen = 'home',
}: {
  initialScreen?: PrimaryScreen;
}) {
  return (
    <DesignThemeContext.Provider value={darkDesignTokens}>
      <SafeAreaProvider>
        <AppContent initialScreen={initialScreen} />
      </SafeAreaProvider>
    </DesignThemeContext.Provider>
  );
}
