import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  DeviceEventEmitter,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
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
  getPlayerRepeatMode,
  movePlayerTrack,
  movePlayerTracks,
  onPlayerError,
  pausePlayer,
  playPlayer,
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
} from '../services/player';
import {
  readSession,
  rememberSessionDetails,
  restoreSession,
  saveSession,
} from '../services/session';
import {
  clearPlaybackHistory,
  createPlaylist,
  deletePlaylist,
  deleteTrackFromDevice,
  exportBackupFile,
  getDeviceTracks,
  getEqualizerSettings,
  getFavoriteTrackIds,
  getStoredLyrics,
  getPlaybackRate,
  getPlaylists,
  getRecentPlayback,
  getStoredPreference,
  getTopPlayed,
  importBackupFile,
  importLrcFile,
  importM3uFile,
  recordPlaybackHistory,
  renamePlaylist,
  setEqualizerSettings as persistEqualizerSettings,
  setPlaybackRate as persistPlaybackRate,
  setPlaylistTracks,
  storeLyrics,
  removeStoredLyrics,
  setTrackFavorite,
  shareTrackFile,
  storePreference,
  storeSession,
} from '../native/musicLibrary';
import type { EqualizerSettings } from '../native/musicLibrary';
import type {
  Playlist,
  RecentPlayback,
  TopPlayed,
  Track,
} from '../types/Track';
import { buildBackup, matchBackup, readBackup } from '../utils/backup';
import { formatTrackCount } from '../utils/formatTrackCount';
import { buildM3u, resolveM3u } from '../utils/m3u';
import { parseLrc } from '../utils/lyrics';
import { exportM3uFile } from '../native/musicLibrary';
import {
  buildQueueMoves,
  resolveActiveQueueIndex,
  restoreUpcomingTrackOrder,
  shuffleTracks,
  shuffleUpcomingTracks,
} from '../utils/shuffleQueue';

export const playbackRates = [0.75, 1, 1.25, 1.5, 2];
export const equalizerBandCount = 5;
export const shortAudioSeconds = 30;

const hideShortAudioKey = 'hideShortAudio';

function libraryPermission() {
  return Number(Platform.Version) >= 33
    ? ('android.permission.READ_MEDIA_AUDIO' as const)
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
}

type PendingQueueRemoval = {
  track: Track;
  index: number;
  originalIndex: number;
  wasCurrent: boolean;
  wasPlaying: boolean;
  position: number;
  nextTrackId: string | null;
};

export function useMusicController({
  onPlaylistCreated,
}: {
  onPlaylistCreated?: (playlist: Playlist) => void;
} = {}) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
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
  const [draftPlaylistTrackIds, setDraftPlaylistTrackIds] = useState<
    Set<string>
  >(new Set());
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState('');
  const [playlistDialogError, setPlaylistDialogError] = useState<string | null>(
    null,
  );
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [queueUpdating, setQueueUpdating] = useState(false);
  const [pendingQueueRemoval, setPendingQueueRemoval] =
    useState<PendingQueueRemoval | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [playlistUndo, setPlaylistUndo] = useState<{
    playlistId: string;
    trackIds: string[];
  } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentPlayback, setRecentPlayback] = useState<RecentPlayback[]>([]);
  const [topPlayed, setTopPlayed] = useState<TopPlayed[]>([]);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [queueTrackDialog, setQueueTrackDialog] = useState<{
    track: Track;
    fromLibrary: boolean;
  } | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [playbackSourceLabel, setPlaybackSourceLabel] =
    useState('Tu biblioteca');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [equalizerSettings, setEqualizerSettings] = useState<EqualizerSettings>(
    {
      enabled: false,
      bandGainsDb: [0, 0, 0, 0, 0],
    },
  );
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [hideShortAudio, setHideShortAudio] = useState(false);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [errorMessage, setErrorMessageState] = useState<string | null>(null);
  const [errorRetryAction, setErrorRetryAction] = useState<(() => void) | null>(
    null,
  );
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const shuffleEnabledRef = useRef(false);
  const [repeatMode, setRepeatMode] = useState(RepeatMode.Off);
  const queueOperationInProgress = useRef(false);
  const libraryLoadInProgress = useRef(false);
  const libraryRefreshPending = useRef(false);
  const hasLibraryPermission = useRef(false);
  const libraryAccessDenied = useRef(false);
  const originalQueueOrder = useRef<Array<{ id: string }>>([]);
  const sessionChecked = useRef(false);
  const restoringSession = useRef(false);
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playlistUndoTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const equalizerWriteChain = useRef<Promise<void>>(Promise.resolve());
  const lastRecordedTrackId = useRef<string | null>(null);
  const playbackPosition = useRef(0);
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const tracksById = useMemo(
    () => new Map(tracks.map(track => [track.id, track])),
    [tracks],
  );
  const currentTrack = tracksById.get(String(activeTrack?.id)) ?? null;
  const recentTracks = useMemo(
    () =>
      recentPlayback
        .map(entry => tracksById.get(entry.trackId))
        .filter((track): track is Track => track !== undefined),
    [recentPlayback, tracksById],
  );
  const topTracks = useMemo(
    () =>
      topPlayed
        .map(entry => tracksById.get(entry.trackId))
        .filter((track): track is Track => track !== undefined),
    [topPlayed, tracksById],
  );
  const playlistTracksById = useMemo(
    () =>
      new Map(
        playlists.map(playlist => [
          playlist.id,
          playlist.trackIds
            .map(trackId => tracksById.get(trackId))
            .filter((track): track is Track => track !== undefined),
        ]),
      ),
    [playlists, tracksById],
  );

  useEffect(() => {
    if (!playerReady || tracks.length === 0 || sessionChecked.current) {
      return;
    }
    sessionChecked.current = true;
    (async () => {
      if ((await getPlayerQueue()).length > 0) {
        return;
      }
      const session = await readSession();
      if (!session) {
        return;
      }
      // A restored song is resumed, not played again: keep it out of the history.
      restoringSession.current = true;
      lastRecordedTrackId.current = session.trackIds[session.index] ?? null;
      const restored = await restoreSession(session, tracks).finally(() => {
        restoringSession.current = false;
      });
      if (restored.length === 0) {
        return;
      }
      const byId = new Map(tracks.map(track => [track.id, track]));
      originalQueueOrder.current = (session.originalTrackIds ?? [])
        .map(id => byId.get(id))
        .filter((track): track is Track => track !== undefined);
      setPlaybackQueue(restored);
      setPlaybackSourceLabel(session.sourceLabel);
      setShuffleEnabled(session.shuffle);
      shuffleEnabledRef.current = session.shuffle;
      setRepeatMode(session.repeatMode ?? RepeatMode.Off);
    })().catch(() => undefined);
  }, [playerReady, tracks]);

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
          const granted = await PermissionsAndroid.request(
            libraryPermission(),
            {
              title: 'Acceso a tu música',
              message:
                'Mi Música necesita permiso para encontrar canciones y leer sus metadatos en este dispositivo.',
              buttonPositive: 'Permitir',
              buttonNegative: 'Ahora no',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            // After "don't ask again" Android no longer shows the dialog.
            const blocked =
              granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
            hasLibraryPermission.current = false;
            libraryAccessDenied.current = true;
            setPermissionDenied(true);
            setPermissionBlocked(blocked);
            setTracks([]);
            setRetryableError(
              blocked
                ? 'Activa el permiso de música en los ajustes del teléfono para ver tus canciones.'
                : 'Sin permiso no podemos mostrar la música del dispositivo. Puedes volver a intentarlo cuando quieras.',
              blocked ? () => Linking.openSettings() : () => loadLibrary(),
            );
            return;
          }
          hasLibraryPermission.current = true;
          libraryAccessDenied.current = false;
          setPermissionDenied(false);
          setPermissionBlocked(false);

          if (Number(Platform.Version) >= 33) {
            await PermissionsAndroid.request(
              'android.permission.POST_NOTIFICATIONS',
            );
          }
        }

        // In this order: reading the tracks may update the saved favorites.
        const deviceTracks = await getDeviceTracks();
        const [favoriteTrackIds, shortAudioHidden] = await Promise.all([
          getFavoriteTrackIds(),
          getStoredPreference(hideShortAudioKey),
        ]);
        const hideShort = shortAudioHidden === 'true';
        setHideShortAudio(hideShort);
        setTracks(
          hideShort
            ? deviceTracks.filter(
                track =>
                  track.duration <= 0 || track.duration >= shortAudioSeconds,
              )
            : deviceTracks,
        );
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
      const [recent, top] = await Promise.all([
        getRecentPlayback(),
        getTopPlayed(),
      ]);
      setRecentPlayback(recent);
      setTopPlayed(top);
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
        // A damaged preference must not stop playback: keep the defaults instead.
        const savedEqualizer = await getEqualizerSettings().catch(() => null);
        if (
          mounted &&
          savedEqualizer?.bandGainsDb.length === equalizerBandCount &&
          savedEqualizer.bandGainsDb.every(
            gain => Number.isFinite(gain) && gain >= -12 && gain <= 12,
          )
        ) {
          setEqualizerSettings(savedEqualizer);
        }
        await setupPlayer();
        const savedRepeatMode = await getPlayerRepeatMode();
        const savedRate = await getPlaybackRate().catch(() => 1);
        const startupRate = playbackRates.includes(savedRate) ? savedRate : 1;
        await setPlayerRate(startupRate);
        if (mounted) {
          setRepeatMode(savedRepeatMode);
          setPlaybackRate(startupRate);
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
        } else if (returnedToForeground && libraryAccessDenied.current) {
          // The person may be back from granting it in the phone settings.
          PermissionsAndroid.check(libraryPermission())
            .then(granted => {
              if (granted) {
                loadLibrary();
              }
            })
            .catch(() => undefined);
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

    const remapSubscription = DeviceEventEmitter.addListener(
      'musicTracksRemapped',
      () => {
        loadPlaylists();
        loadPlaybackHistory();
      },
    );
    const errorSubscription = onPlayerError(() => {
      setErrorMessage('Una canción no se pudo reproducir y se saltó.');
    });

    return () => {
      appStateSubscription.remove();
      librarySubscription.remove();
      remapSubscription.remove();
      errorSubscription?.remove();
    };
  }, [loadLibrary, loadPlaybackHistory, loadPlaylists, setErrorMessage]);

  useEffect(() => {
    const trackId = activeTrack?.id;
    if (
      !playerReady ||
      !trackId ||
      restoringSession.current ||
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
    if (!playerReady || tracks.length === 0) {
      return;
    }

    getPlayerQueue()
      .then(async queue => {
        // A song that left the library must leave the player too, or the
        // positions shown in the queue stop matching the real ones.
        if (!queueOperationInProgress.current) {
          const missing = queue
            .map((item, index) =>
              tracksById.has(String(item.id)) ? -1 : index,
            )
            .filter(index => index >= 0)
            .reverse();
          for (const index of missing) {
            await removePlayerTrack(index);
          }
        }
        const liveQueue = queue
          .map(item => tracksById.get(String(item.id)))
          .filter((track): track is Track => track !== undefined);
        setPlaybackQueue(liveQueue);
        // This runs on every library refresh, when the live queue may be shuffled:
        // only the first load may define the order that shuffling restores.
        originalQueueOrder.current =
          originalQueueOrder.current.length === 0
            ? liveQueue
            : originalQueueOrder.current
                .map(track => tracksById.get(track.id))
                .filter((track): track is Track => track !== undefined);
      })
      .catch(error => {
        setErrorMessage(
          error instanceof Error
            ? `No se pudo recuperar la cola: ${error.message}`
            : 'No se pudo recuperar la cola de reproducción.',
        );
      });
  }, [playerReady, setErrorMessage, tracks, tracksById]);

  useEffect(
    () => () => {
      if (undoTimeout.current) {
        clearTimeout(undoTimeout.current);
      }
      if (undoInterval.current) {
        clearInterval(undoInterval.current);
      }
      if (queueNoticeTimeout.current) {
        clearTimeout(queueNoticeTimeout.current);
      }
    },
    [],
  );

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
      setTopPlayed(current =>
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
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo cambiar la posición: ${error.message}`
          : 'No se pudo cambiar la posición.',
      );
      return false;
    }
  }

  async function changePlaybackRate(nextRate: number) {
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
              .then(() => {
                setRecentPlayback([]);
                setTopPlayed([]);
              })
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
      rememberSessionDetails({
        originalTrackIds: queueTracks.map(item => item.id),
        sourceLabel,
      });
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
    let createdPlaylist: Playlist | null = null;
    try {
      if (dialog.playlistId) {
        await renamePlaylist(dialog.playlistId, normalizedName);
      } else {
        const playlist = await createPlaylist(normalizedName);
        if (dialog.trackIds?.length) {
          await setPlaylistTracks(playlist.id, dialog.trackIds);
        }
        createdPlaylist = playlist;
      }
      setPlaylists(await getPlaylists());
      if (createdPlaylist) {
        onPlaylistCreated?.(createdPlaylist);
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

  async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const selectedPlaylist = playlists.find(item => item.id === playlistId);
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
      setPlaylistUndo({
        playlistId,
        trackIds: selectedPlaylist.trackIds,
      });
      if (playlistUndoTimeout.current) {
        clearTimeout(playlistUndoTimeout.current);
      }
      playlistUndoTimeout.current = setTimeout(() => {
        setPlaylistUndo(null);
      }, 4000);
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

  async function movePlaylistTrack(
    playlistId: string,
    fromIndex: number,
    toIndex: number,
  ) {
    const selectedPlaylist = playlists.find(item => item.id === playlistId);
    if (!selectedPlaylist || savingPlaylist) {
      return;
    }
    // The positions are those on screen, which skip songs not on this phone.
    const visibleTrackIds = selectedPlaylist.trackIds.filter(id =>
      tracksById.has(id),
    );
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= visibleTrackIds.length ||
      toIndex >= visibleTrackIds.length
    ) {
      return;
    }
    const updatedTrackIds = [...selectedPlaylist.trackIds];
    const [movedTrackId] = updatedTrackIds.splice(
      updatedTrackIds.indexOf(visibleTrackIds[fromIndex]),
      1,
    );
    updatedTrackIds.splice(
      selectedPlaylist.trackIds.indexOf(visibleTrackIds[toIndex]),
      0,
      movedTrackId,
    );
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
      saveSession().catch(() => undefined);
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
    targetIds: string[],
    currentIds: string[],
    activeIndex: number,
  ) {
    if (activeIndex < 0 || activeIndex >= currentIds.length) {
      throw new Error('No se pudo identificar la canción que está sonando.');
    }
    const activeId = currentIds[activeIndex];
    const start = activeIndex + 1;
    const currentUpcoming = currentIds.slice(start);
    const currentUpcomingSet = new Set(currentUpcoming);
    const desiredUpcoming = targetIds.filter(id => currentUpcomingSet.has(id));
    const desiredUpcomingSet = new Set(desiredUpcoming);
    const desiredIds = [
      ...currentIds.slice(0, start),
      ...desiredUpcoming,
      ...currentUpcoming.filter(id => !desiredUpcomingSet.has(id)),
    ];
    const moves = buildQueueMoves(currentIds, desiredIds, start);
    if (moves.length === 0) {
      return;
    }

    // The native player validates this exact snapshot and applies the whole
    // move list in one main-thread call, so playback cannot advance between moves.
    await movePlayerTracks(moves, currentIds, activeId);
  }

  async function toggleShuffle() {
    if (!playerReady || queueOperationInProgress.current) {
      return;
    }

    const previousEnabled = shuffleEnabledRef.current;
    const nextEnabled = !previousEnabled;

    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    setShuffleEnabled(nextEnabled);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const previousOriginalOrder = [...originalQueueOrder.current];
    let startingQueue: Array<{ id: string }> = [];
    try {
      const nativeQueue = await getPlayerQueue();
      const liveQueue = nativeQueue.map(item => ({ id: String(item.id) }));
      startingQueue = [...liveQueue];
      const nativeActiveIndex = await getActivePlayerTrackIndex();
      const safeActiveIndex = resolveActiveQueueIndex(
        liveQueue.map(item => item.id),
        nativeActiveIndex,
        currentTrack?.id,
      );
      const liveActiveId = liveQueue[safeActiveIndex]?.id ?? null;
      if (liveQueue.length === 0) {
        setShuffleEnabled(previousEnabled);
        return;
      }
      if (safeActiveIndex < 0 || !liveActiveId) {
        throw new Error('No se pudo identificar la canción que está sonando.');
      }

      if (nextEnabled) {
        originalQueueOrder.current = liveQueue;
      }
      const targetQueue = nextEnabled
        ? shuffleUpcomingTracks(liveQueue, liveActiveId ?? '')
        : restoreUpcomingTrackOrder(
            liveQueue,
            originalQueueOrder.current,
            liveActiveId ?? '',
          );
      await applyUpcomingQueueOrder(
        targetQueue.map(item => item.id),
        liveQueue.map(item => item.id),
        safeActiveIndex,
      );
      await refreshPlaybackQueue();
      shuffleEnabledRef.current = nextEnabled;
      if (!nextEnabled) {
        originalQueueOrder.current = [];
      }
      rememberSessionDetails({
        shuffle: nextEnabled,
        originalTrackIds: originalQueueOrder.current.map(track => track.id),
      });
      setErrorMessage(null);
    } catch (error) {
      setShuffleEnabled(previousEnabled);
      let message =
        error instanceof Error
          ? `No se pudo cambiar la mezcla: ${error.message}`
          : 'No se pudo cambiar el orden aleatorio de la cola.';
      try {
        const latestQueue = (await getPlayerQueue()).map(item => ({
          id: String(item.id),
        }));
        const latestActiveIndex = await getActivePlayerTrackIndex();
        const latestSafeIndex = resolveActiveQueueIndex(
          latestQueue.map(item => item.id),
          latestActiveIndex,
          currentTrack?.id,
        );
        const latestActiveId = latestQueue[latestSafeIndex]?.id ?? null;
        if (latestSafeIndex < 0 || !latestActiveId) {
          throw new Error('No se pudo identificar la canción activa para recuperar la cola.');
        }
        const rollbackTarget = restoreUpcomingTrackOrder(
          latestQueue,
          startingQueue.length > 0 ? startingQueue : latestQueue,
          latestActiveId ?? '',
        );
        await applyUpcomingQueueOrder(
          rollbackTarget.map(item => item.id),
          latestQueue.map(item => item.id),
          latestSafeIndex,
        );
        await refreshPlaybackQueue();
      } catch (refreshError) {
        const detail =
          refreshError instanceof Error
            ? refreshError.message
            : 'No se pudo recuperar el estado de la cola.';
        message = `${message} ${detail}`;
      }
      originalQueueOrder.current = previousOriginalOrder;
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
    setPlaybackQueue(
      queue
        .map(item => tracksById.get(String(item.id)))
        .filter((track): track is Track => track !== undefined),
    );
    // An empty queue is not saved, so the old one must not come back.
    (queue.length === 0 ? storeSession('') : saveSession()).catch(
      () => undefined,
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

  async function undoPlaylistRemoval() {
    if (!playlistUndo) {
      return;
    }
    const { playlistId, trackIds } = playlistUndo;
    setPlaylistUndo(null);
    try {
      await setPlaylistTracks(playlistId, trackIds);
      setPlaylists(current =>
        current.map(item =>
          item.id === playlistId ? { ...item, trackIds } : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo deshacer: ${error.message}`
          : 'No se pudo deshacer.',
      );
    }
  }

  async function addTrackToPlaylist(playlist: Playlist, track: Track) {
    if (playlist.trackIds.includes(track.id)) {
      showQueueNotice(`${track.title} ya está en ${playlist.name}.`);
      return;
    }
    const trackIds = [...playlist.trackIds, track.id];
    try {
      await setPlaylistTracks(playlist.id, trackIds);
      setPlaylists(current =>
        current.map(item =>
          item.id === playlist.id ? { ...item, trackIds } : item,
        ),
      );
      showQueueNotice(`Añadida a ${playlist.name}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo añadir a la lista: ${error.message}`
          : 'No se pudo añadir a la lista.',
      );
    }
  }

  async function importPlaylistFile(playlist: Playlist) {
    try {
      const contents = await importM3uFile();
      if (contents === null) {
        return;
      }
      const imported = resolveM3u(contents, tracks);
      const existingIds = new Set(playlist.trackIds);
      const newIds = imported.trackIds.filter(id => !existingIds.has(id));
      const trackIds = [...playlist.trackIds, ...newIds];
      if (trackIds.length === playlist.trackIds.length && imported.missing.length === 0) {
        Alert.alert('Lista vacía', 'El archivo no contiene canciones nuevas para esta lista.');
        return;
      }
      await setPlaylistTracks(playlist.id, trackIds);
      setPlaylists(current =>
        current.map(item => (item.id === playlist.id ? { ...item, trackIds } : item)),
      );
      const skipped = imported.duplicates.length + imported.trackIds.length - newIds.length;
      Alert.alert(
        'Importación completada',
        `Añadidas: ${newIds.length}. No encontradas: ${imported.missing.length}. ` +
          `Duplicadas: ${skipped}. Entradas malformadas: ${imported.malformedLines}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo importar la lista: ${error.message}`
          : 'No se pudo importar el archivo M3U.',
      );
    }
  }

  async function exportPlaylistM3u(playlist: Playlist) {
    try {
      const playlistTracks = playlist.trackIds
        .map(id => tracksById.get(id))
        .filter((track): track is Track => track !== undefined);
      const safeName = playlist.name
        .replace(/[<>:"/\\|?*]/g, '-')
        .split('')
        .map(character => (character.charCodeAt(0) < 32 ? '-' : character))
        .join('')
        .trim() || 'lista';
      const saved = await exportM3uFile(`${safeName}.m3u8`, buildM3u(playlistTracks));
      if (saved) {
        showQueueNotice('Lista M3U guardada.');
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo exportar la lista: ${error.message}`
          : 'No se pudo exportar el archivo M3U.',
      );
    }
  }

  async function importTrackLyrics(track: Track): Promise<boolean> {
    try {
      const contents = await importLrcFile();
      if (contents === null) {
        return false;
      }
      if (parseLrc(contents).length === 0) {
        Alert.alert('Archivo LRC no válido', 'El archivo no contiene líneas con marcas de tiempo reconocibles.');
        return false;
      }
      await storeLyrics(track.id, contents);
      showQueueNotice(`Letras guardadas para ${track.title}.`);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudieron guardar las letras: ${error.message}`
          : 'No se pudieron guardar las letras locales.',
      );
      return false;
    }
  }

  const getTrackLyrics = useCallback(
    (trackId: string): Promise<string | null> => getStoredLyrics(trackId),
    [],
  );

  async function deleteTrackLyrics(trackId: string): Promise<boolean> {
    try {
      await removeStoredLyrics(trackId);
      showQueueNotice('Letras eliminadas.');
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudieron eliminar las letras: ${error.message}`
          : 'No se pudieron eliminar las letras.',
      );
      return false;
    }
  }

  function requestLibraryAccess() {
    if (permissionBlocked) {
      Linking.openSettings().catch(() => undefined);
    } else {
      loadLibrary();
    }
  }

  async function toggleHideShortAudio() {
    try {
      await storePreference(hideShortAudioKey, String(!hideShortAudio));
      await loadLibrary(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo guardar el ajuste: ${error.message}`
          : 'No se pudo guardar el ajuste.',
      );
    }
  }

  async function shareTrack(track: Track) {
    setQueueTrackDialog(null);
    try {
      await shareTrackFile(track.id, track.title);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudieron eliminar las letras: ${error.message}`
          : 'No se pudieron eliminar las letras.',
      );
    }
  }

  async function exportLibraryBackup() {
    try {
      const backup = buildBackup(tracks, favoriteIds, playlists);
      const date = new Date().toISOString().slice(0, 10);
      const saved = await exportBackupFile(
        `mi-musica-copia-${date}.json`,
        JSON.stringify(backup),
      );
      if (saved) {
        showQueueNotice('Copia de seguridad guardada.');
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo guardar la copia: ${error.message}`
          : 'No se pudo guardar la copia de seguridad.',
      );
    }
  }

  /** Adds to what is already here: restoring never deletes favorites or lists. */
  async function restoreLibraryBackup() {
    try {
      const text = await importBackupFile();
      if (text === null) {
        return;
      }
      const backup = readBackup(text);
      if (!backup) {
        setErrorMessage('Ese archivo no es una copia de Mi Música.');
        return;
      }
      const restored = matchBackup(backup, tracks);
      for (const trackId of restored.favoriteIds) {
        await setTrackFavorite(trackId, true);
      }
      const current = await getPlaylists();
      for (const saved of restored.playlists) {
        const existing = current.find(
          item => item.name.toLowerCase() === saved.name.toLowerCase(),
        );
        const playlist = existing ?? (await createPlaylist(saved.name));
        await setPlaylistTracks(playlist.id, [
          ...new Set([...playlist.trackIds, ...saved.trackIds]),
        ]);
      }
      setFavoriteIds(ids => new Set([...ids, ...restored.favoriteIds]));
      setPlaylists(await getPlaylists());
      showQueueNotice(
        restored.missingCount > 0
          ? `Copia restaurada. Faltan en este teléfono: ${formatTrackCount(
              restored.missingCount,
            )}.`
          : 'Copia restaurada.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo restaurar la copia: ${error.message}`
          : 'No se pudo restaurar la copia de seguridad.',
      );
    }
  }

  return {
    tracks,
    tracksById,
    playlists,
    playlistTracksById,
    recentTracks,
    topTracks,
    favoriteIds,
    currentTrack,
    isPlaying,
    playerReady,
    playerExpanded,
    setPlayerExpanded,
    queueVisible,
    setQueueVisible,
    playbackQueue,
    playbackSourceLabel,
    shuffleEnabled,
    repeatMode,
    playbackRate,
    equalizerSettings,
    loadingLibrary,
    permissionDenied,
    permissionBlocked,
    requestLibraryAccess,
    hideShortAudio,
    toggleHideShortAudio,
    shareTrack,
    exportLibraryBackup,
    restoreLibraryBackup,
    loadingPlaylists,
    savingPlaylist,
    queueUpdating,
    queueNotice,
    errorMessage,
    errorRetryAction,
    setErrorMessage,
    pendingQueueRemoval,
    undoSecondsLeft,
    playlistUndo,
    undoPlaylistRemoval,
    queueTrackDialog,
    setQueueTrackDialog,
    playlistNameDialog,
    setPlaylistNameDialog,
    playlistToDelete,
    setPlaylistToDelete,
    playlistDialogError,
    setPlaylistDialogError,
    trackPickerPlaylistId,
    setTrackPickerPlaylistId,
    draftPlaylistTrackIds,
    playlistTrackSearch,
    setPlaylistTrackSearch,
    loadLibrary,
    rememberPlaybackPosition,
    toggleFavorite,
    confirmDeleteTrack,
    seekToPosition,
    changePlaybackRate,
    updateEqualizerSettings,
    changeEqualizerBand,
    clearRecentPlayback,
    playTracks,
    playPlaylist,
    savePlaylistName,
    confirmDeletePlaylist,
    openPlaylistTrackPicker,
    toggleDraftPlaylistTrack,
    savePlaylistTracks,
    removeTrackFromPlaylist,
    movePlaylistTrack,
    saveQueueAsPlaylist,
    confirmClearQueue,
    togglePlayback,
    skipTrack,
    cycleRepeatMode,
    showQueueNotice,
    toggleShuffle,
    addTrackToQueue,
    addTrackToPlaylist,
    importPlaylistFile,
    exportPlaylistM3u,
    importTrackLyrics,
    getTrackLyrics,
    deleteTrackLyrics,
    playQueueTrack,
    moveQueueTrack,
    removeQueueTrack,
    undoQueueRemoval,
  };
}

export type MusicController = ReturnType<typeof useMusicController>;
