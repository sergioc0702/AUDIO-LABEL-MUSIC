import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
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
  jumpPlayerBy,
  setLongAudioControls,
  getPlayerRepeatMode,
  movePlayerTrack,
  reorderUpcomingTracks,
  onPlayerError,
  pausePlayer,
  playPlayer,
  removePlayerTrack,
  removeUpcomingPlayerTracks,
  replacePlayerQueue,
  resetPlayerQueue,
  seekPlayerTo,
  setPlayerRepeatMode,
  setupPlayer,
  skipToNextPlayerTrack,
  skipToPlayerTrack,
  skipToPreviousPlayerTrack,
} from '../services/playback/player';
import {
  longAudioSeconds,
  onResumed,
} from '../services/playback/resumePositions';
import { claimRemoteShuffle } from '../services/playback/remoteShuffle';
import {
  getSessionDetails,
  readSession,
  rememberSessionDetails,
  restoreSession,
  saveSession,
} from '../services/playback/session';
import {
  deleteTrackFromDevice,
  deleteTracksFromDevice,
  recordPlaybackHistory,
  setTrackFavorite,
  refreshNotification,
  setNotificationShuffle,
  storeSession,
} from '../native/musicLibrary';
import type { Playlist, Track } from '../types/Track';
import { describeFailure } from './music/failure';
import { useLibrary } from './music/useLibrary';
import { useNotices } from './music/useNotices';
import { usePlaybackHistory } from './music/usePlaybackHistory';
import { usePlaylists } from './music/usePlaylists';
import { useSelection } from './music/useSelection';
import { useSoundSettings } from './music/useSoundSettings';
import { useTrackFiles } from './music/useTrackFiles';
import { formatTrackCount } from '../utils/formatTrackCount';
import { formatTime } from '../utils/formatTime';
import {
  resolveActiveQueueIndex,
  restoreUpcomingTrackOrder,
  shuffleTracks,
  shuffleUpcomingTracks,
} from '../domain/shuffleQueue';

type PendingQueueRemoval = {
  track: Track;
  index: number;
  originalIndex: number;
  wasCurrent: boolean;
  wasPlaying: boolean;
  position: number;
  nextTrackId: string | null;
};

/**
 * Everything the screens can do with the music. The library, playlists,
 * history, sound settings, files and selection live in ./music; this hook
 * joins them and owns what touches the player: the queue, shuffle, repeat,
 * the saved session and deleting songs.
 */
export function useMusicController({
  onPlaylistCreated,
}: {
  onPlaylistCreated?: (playlist: Playlist) => void;
} = {}) {
  const notices = useNotices();
  const { setErrorMessage, setRetryableError, showQueueNotice } = notices;
  const library = useLibrary(notices);
  const {
    tracks,
    setTracks,
    tracksById,
    favoriteIds,
    setFavoriteIds,
    loadLibrary,
  } = library;
  const history = usePlaybackHistory({ tracksById, ...notices });
  const { setRecentPlayback, setTopPlayed, loadPlaybackHistory } = history;
  const playlistState = usePlaylists({
    tracks,
    tracksById,
    onPlaylistCreated,
    ...notices,
  });
  const {
    playlists,
    setPlaylists,
    loadPlaylists,
    setPlaylistNameDialog,
    setPlaylistDialogError,
  } = playlistState;
  const sound = useSoundSettings(notices);
  const { restoreEqualizer, restoreTuning } = sound;
  const selection = useSelection({ tracks, tracksById });
  const { selectedTracks, clearSelection } = selection;
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [queueUpdating, setQueueUpdating] = useState(false);
  const [pendingQueueRemoval, setPendingQueueRemoval] =
    useState<PendingQueueRemoval | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [queueTrackDialog, setQueueTrackDialog] = useState<{
    track: Track;
    fromLibrary: boolean;
  } | null>(null);
  const [playbackSourceLabel, setPlaybackSourceLabel] =
    useState('Tu biblioteca');
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const shuffleEnabledRef = useRef(false);
  const [repeatMode, setRepeatMode] = useState(RepeatMode.Off);
  const queueOperationInProgress = useRef(false);
  const trackFiles = useTrackFiles({
    tracks,
    favoriteIds,
    setFavoriteIds,
    playlists,
    setPlaylists,
    setQueueTrackDialog,
    ...notices,
  });
  const originalQueueOrder = useRef<Array<{ id: string }>>([]);
  const sessionChecked = useRef(false);
  const restoringSession = useRef(false);
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecordedTrackId = useRef<string | null>(null);
  const playbackPosition = useRef(0);
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const currentTrack = tracksById.get(String(activeTrack?.id)) ?? null;

  useEffect(() => {
    if (!playerReady || tracks.length === 0 || sessionChecked.current) {
      return;
    }
    sessionChecked.current = true;
    (async () => {
      if ((await getPlayerQueue()).length > 0) {
        // The screens reopened while music kept playing: shuffle may have
        // changed from the widget or the notification in the meantime.
        const details = getSessionDetails();
        const byId = new Map(tracks.map(track => [track.id, track]));
        setShuffleEnabled(details.shuffle);
        shuffleEnabledRef.current = details.shuffle;
        originalQueueOrder.current = details.originalTrackIds
          .map(id => byId.get(id))
          .filter((track): track is Track => track !== undefined);
        setPlaybackSourceLabel(details.sourceLabel);
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

  const rememberPlaybackPosition = useCallback((position: number) => {
    playbackPosition.current = position;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function preparePlayer() {
      try {
        const isMounted = () => mounted;
        await restoreEqualizer(isMounted);
        await setupPlayer();
        await restoreTuning(isMounted);
        const savedRepeatMode = await getPlayerRepeatMode();
        if (mounted) {
          setRepeatMode(savedRepeatMode);
          setPlayerReady(true);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            describeFailure(
              error,
              'No se pudo iniciar el reproductor',
              'No se pudo iniciar el reproductor.',
            ),
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
    restoreEqualizer,
    restoreTuning,
    loadLibrary,
    loadPlaybackHistory,
    loadPlaylists,
    setErrorMessage,
    setRetryableError,
  ]);

  useEffect(() => {
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
      remapSubscription.remove();
      errorSubscription?.remove();
    };
  }, [loadPlaybackHistory, loadPlaylists, setErrorMessage]);

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
          describeFailure(
            error,
            'No se pudo guardar el historial',
            'No se pudo guardar el historial de reproducción.',
          ),
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
          describeFailure(
            error,
            'No se pudo recuperar la cola',
            'No se pudo recuperar la cola de reproducción.',
          ),
        );
      });
  }, [playerReady, setErrorMessage, tracks, tracksById]);

  // The notification and the lock screen show the state of these buttons.
  useEffect(() => {
    setNotificationShuffle(shuffleEnabled);
  }, [shuffleEnabled]);

  const longAudioPlaying =
    currentTrack !== null && currentTrack.duration >= longAudioSeconds;
  useEffect(() => {
    if (playerReady) {
      setLongAudioControls(longAudioPlaying).catch(() => undefined);
    }
  }, [longAudioPlaying, playerReady]);

  // A tap on a notification button arrives here; repeat and favorite are
  // already saved by the native side.
  const toggleShuffleRef = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => {
    const releaseShuffle = claimRemoteShuffle();
    const subscription = DeviceEventEmitter.addListener(
      'notificationAction',
      (event: { action: string; trackId: string | null }) => {
        if (event.action === 'shuffle') {
          // The button already flipped; if the queue could not change, it
          // must show the real state again.
          toggleShuffleRef
            .current()
            .finally(() => setNotificationShuffle(shuffleEnabledRef.current));
        } else if (event.action === 'repeat') {
          getPlayerRepeatMode()
            .then(mode => {
              setRepeatMode(mode);
              return saveSession();
            })
            .catch(() => undefined);
        } else if (event.action === 'favorite' && event.trackId) {
          const trackId = event.trackId;
          setFavoriteIds(current => {
            const updated = new Set(current);
            if (updated.has(trackId)) {
              updated.delete(trackId);
            } else {
              updated.add(trackId);
            }
            return updated;
          });
        }
      },
    );
    return () => {
      releaseShuffle();
      subscription.remove();
    };
  }, [setFavoriteIds]);

  useEffect(
    () =>
      onResumed(position => {
        showQueueNotice(`Continúa desde ${formatTime(position)}.`);
      }),
    [showQueueNotice],
  );

  useEffect(
    () => () => {
      if (undoTimeout.current) {
        clearTimeout(undoTimeout.current);
      }
      if (undoInterval.current) {
        clearInterval(undoInterval.current);
      }
    },
    [],
  );

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
          queueCleanupError = describeFailure(
            error,
            'La canción se eliminó, pero no se pudo actualizar la cola',
            'La canción se eliminó, pero no se pudo actualizar la cola.',
          );
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
        describeFailure(
          error,
          'No se pudo cambiar la posición',
          'No se pudo cambiar la posición.',
        ),
      );
      return false;
    }
  }

  async function jumpBy(seconds: number) {
    try {
      await jumpPlayerBy(seconds);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo cambiar la posición',
          'No se pudo cambiar la posición.',
        ),
      );
    }
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
        describeFailure(
          error,
          'No se pudo reproducir la canción',
          'No se pudo reproducir la canción.',
        ),
      );
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
                  describeFailure(
                    error,
                    'No se pudo vaciar la cola',
                    'No se pudo vaciar la cola de reproducción.',
                  ),
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
        describeFailure(
          error,
          'No se pudo controlar la reproducción',
          'No se pudo controlar la reproducción.',
        ),
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
        describeFailure(
          error,
          'No se pudo cambiar la repetición',
          'No se pudo cambiar la repetición.',
        ),
      );
    }
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
      await reorderUpcomingTracks(
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
      let message = describeFailure(
        error,
        'No se pudo cambiar la mezcla',
        'No se pudo cambiar el orden aleatorio de la cola.',
      );
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
          throw new Error(
            'No se pudo identificar la canción activa para recuperar la cola.',
          );
        }
        const rollbackTarget = restoreUpcomingTrackOrder(
          latestQueue,
          startingQueue.length > 0 ? startingQueue : latestQueue,
          latestActiveId ?? '',
        );
        await reorderUpcomingTracks(
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

  toggleShuffleRef.current = toggleShuffle;

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
        describeFailure(
          error,
          'No se pudo añadir la canción a la cola',
          'No se pudo añadir la canción a la cola.',
        ),
      );
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  /** Adds several songs after the current one, or at the end, in their order. */
  async function addTracksToQueue(items: Track[], placement: 'next' | 'end') {
    if (
      !playerReady ||
      queueOperationInProgress.current ||
      items.length === 0
    ) {
      return;
    }
    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      const nativeQueue = await getPlayerQueue();
      const queuedIds = new Set(nativeQueue.map(item => String(item.id)));
      const fresh = items.filter(item => !queuedIds.has(item.id));
      if (nativeQueue.length === 0) {
        queueOperationInProgress.current = false;
        await playTracks(items, items[0], 'Cola de reproducción');
        showQueueNotice(`${formatTrackCount(items.length)} en la cola.`);
        return;
      }
      if (fresh.length === 0) {
        showQueueNotice('Esas canciones ya están en la cola.');
        return;
      }
      const activeIndex = (await getActivePlayerTrackIndex()) ?? -1;
      let insertIndex =
        placement === 'next'
          ? Math.max(0, Math.min(activeIndex + 1, nativeQueue.length))
          : nativeQueue.length;
      const originalIndex =
        placement === 'end'
          ? originalQueueOrder.current.length
          : Math.max(
              0,
              originalQueueOrder.current.findIndex(
                item => item.id === activeTrack?.id,
              ) + 1,
            );
      for (const item of fresh) {
        await addPlayerTrack(item, insertIndex);
        insertIndex += 1;
      }
      originalQueueOrder.current.splice(originalIndex, 0, ...fresh);
      await refreshPlaybackQueue();
      showQueueNotice(
        placement === 'next'
          ? `${formatTrackCount(fresh.length)} a continuación.`
          : `${formatTrackCount(fresh.length)} al final de la cola.`,
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudieron añadir las canciones',
          'No se pudieron añadir las canciones a la cola.',
        ),
      );
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  async function favoriteSelection() {
    const items = selectedTracks().filter(track => !favoriteIds.has(track.id));
    try {
      for (const track of items) {
        await setTrackFavorite(track.id, true);
      }
      setFavoriteIds(current => new Set([...current, ...items.map(t => t.id)]));
      refreshNotification();
      showQueueNotice(
        items.length > 0
          ? `${formatTrackCount(items.length)} en favoritas.`
          : 'Ya estaban en favoritas.',
      );
      clearSelection();
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo actualizar favoritos',
          'No se pudo actualizar favoritos.',
        ),
      );
    }
  }

  function confirmDeleteSelection() {
    const items = selectedTracks();
    if (items.length === 0) {
      return;
    }
    Alert.alert(
      'Eliminar del dispositivo',
      `Se eliminarán ${formatTrackCount(
        items.length,
      )} del almacenamiento del dispositivo. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteSelection(items);
          },
        },
      ],
    );
  }

  async function deleteSelection(items: Track[]) {
    if (deletingTrackId !== null || queueOperationInProgress.current) {
      setErrorMessage(
        'Espera a que termine la acción actual antes de eliminar.',
      );
      return;
    }
    queueOperationInProgress.current = true;
    setQueueUpdating(true);
    try {
      const deleted = new Set(
        await deleteTracksFromDevice(items.map(track => track.id)),
      );
      if (deleted.size === 0) {
        return;
      }
      if (playerReady) {
        const nativeQueue = await getPlayerQueue();
        const indexes = nativeQueue
          .map((item, index) => (deleted.has(String(item.id)) ? index : -1))
          .filter(index => index >= 0)
          .reverse();
        if (activeTrack && deleted.has(String(activeTrack.id))) {
          await pausePlayer();
        }
        for (const index of indexes) {
          await removePlayerTrack(index);
        }
      }
      originalQueueOrder.current = originalQueueOrder.current.filter(
        item => !deleted.has(item.id),
      );
      clearSelection();
      await Promise.all([loadLibrary(false), loadPlaylists()]);
      loadPlaybackHistory();
      showQueueNotice(
        `${formatTrackCount(deleted.size)} eliminadas del dispositivo.`,
      );
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo completar la eliminación',
          'No se pudo completar la eliminación.',
        ),
      );
      loadLibrary(false);
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
        describeFailure(
          error,
          'No se pudo reproducir desde la cola',
          'No se pudo reproducir esa canción de la cola.',
        ),
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
        describeFailure(
          error,
          'No se pudo reordenar la cola',
          'No se pudo reordenar la cola.',
        ),
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
        describeFailure(
          error,
          'No se pudo quitar la canción de la cola',
          'No se pudo quitar la canción de la cola.',
        ),
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
        describeFailure(
          error,
          'No se pudo deshacer la eliminación',
          'No se pudo deshacer la eliminación.',
        ),
      );
    } finally {
      queueOperationInProgress.current = false;
      setQueueUpdating(false);
    }
  }

  return {
    ...notices,
    ...library,
    ...history,
    ...playlistState,
    ...sound,
    ...selection,
    ...trackFiles,
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
    favoriteSelection,
    confirmDeleteSelection,
    addTracksToQueue,
    jumpBy,
    queueUpdating,
    pendingQueueRemoval,
    undoSecondsLeft,
    queueTrackDialog,
    setQueueTrackDialog,
    rememberPlaybackPosition,
    confirmDeleteTrack,
    seekToPosition,
    playTracks,
    saveQueueAsPlaylist,
    confirmClearQueue,
    togglePlayback,
    skipTrack,
    cycleRepeatMode,
    toggleShuffle,
    addTrackToQueue,
    playQueueTrack,
    moveQueueTrack,
    removeQueueTrack,
    undoQueueRemoval,
  };
}

export type MusicController = ReturnType<typeof useMusicController>;
