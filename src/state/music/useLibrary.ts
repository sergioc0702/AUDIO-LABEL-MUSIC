import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  DeviceEventEmitter,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  getDeviceTracks,
  getFavoriteTrackIds,
  getStoredPreference,
  refreshNotification,
  setTrackFavorite,
  storePreference,
} from '../../native/musicLibrary';
import type { Track } from '../../types/Track';
import {
  listDeviceFolders,
  readExcludedFolders,
  withoutExcludedFolders,
  type DeviceFolder,
} from '../../domain/folders';
import {
  applyTrackEdits,
  buildTrackEdit,
  readTrackEdits,
  type TrackEditForm,
  type TrackEdits,
} from '../../domain/trackEdits';
import { describeFailure } from './failure';
import type { Notices } from './useNotices';

/** Shorter audios (ringtones, voice notes) can be hidden from the library. */
export const shortAudioSeconds = 30;

const hideShortAudioKey = 'hideShortAudio';
const excludedFoldersKey = 'excludedFolders';
const trackEditsKey = 'trackEdits';

function libraryPermission() {
  return Number(Platform.Version) >= 33
    ? ('android.permission.READ_MEDIA_AUDIO' as const)
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
}

/**
 * The songs on the phone: permission, reading them, hidden folders, the
 * person's corrections and favorites. It reloads when the phone's music
 * changes or the app comes back.
 */
export function useLibrary({
  setErrorMessage,
  setRetryableError,
  showQueueNotice,
}: Pick<Notices, 'setErrorMessage' | 'setRetryableError' | 'showQueueNotice'>) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [hideShortAudio, setHideShortAudio] = useState(false);
  const [deviceFolders, setDeviceFolders] = useState<DeviceFolder[]>([]);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);
  const [trackEdits, setTrackEdits] = useState<TrackEdits>({});
  /** The songs as their files describe them, before the person's corrections. */
  const originalTracks = useRef(new Map<string, Track>());
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const libraryLoadInProgress = useRef(false);
  const libraryRefreshPending = useRef(false);
  const hasLibraryPermission = useRef(false);
  const libraryAccessDenied = useRef(false);
  const tracksById = useMemo(
    () => new Map(tracks.map(track => [track.id, track])),
    [tracks],
  );

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
        const [favoriteTrackIds, shortAudioHidden, storedFolders, storedEdits] =
          await Promise.all([
            getFavoriteTrackIds(),
            getStoredPreference(hideShortAudioKey),
            getStoredPreference(excludedFoldersKey),
            getStoredPreference(trackEditsKey),
          ]);
        const hideShort = shortAudioHidden === 'true';
        const hiddenFolders = readExcludedFolders(storedFolders);
        const edits = readTrackEdits(storedEdits);
        const shown = withoutExcludedFolders(
          deviceTracks,
          hiddenFolders,
        ).filter(
          track =>
            !hideShort ||
            track.duration <= 0 ||
            track.duration >= shortAudioSeconds,
        );
        originalTracks.current = new Map(shown.map(track => [track.id, track]));
        setHideShortAudio(hideShort);
        setDeviceFolders(listDeviceFolders(deviceTracks));
        setExcludedFolders(hiddenFolders);
        setTrackEdits(edits);
        setTracks(applyTrackEdits(shown, edits));
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
  async function toggleFavorite(track: Track) {
    const isFavorite = !favoriteIds.has(track.id);
    try {
      await setTrackFavorite(track.id, isFavorite);
      refreshNotification();
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
        describeFailure(
          error,
          'No se pudo actualizar favoritos',
          'No se pudo actualizar favoritos.',
        ),
      );
    }
  }
  async function toggleFolderExcluded(path: string) {
    const next = excludedFolders.includes(path)
      ? excludedFolders.filter(item => item !== path)
      : [...excludedFolders, path];
    try {
      await storePreference(excludedFoldersKey, JSON.stringify(next));
      setExcludedFolders(next);
      await loadLibrary(false);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo guardar el ajuste',
          'No se pudo guardar el ajuste.',
        ),
      );
    }
  }
  /** Saves the person's corrections for a song; null puts back what the file says. */
  async function saveTrackEdit(track: Track, form: TrackEditForm | null) {
    const original = originalTracks.current.get(track.id) ?? track;
    const edit = form ? buildTrackEdit(original, form) : null;
    const next = { ...trackEdits };
    if (edit) {
      next[track.id] = edit;
    } else {
      delete next[track.id];
    }
    try {
      await storePreference(trackEditsKey, JSON.stringify(next));
      setTrackEdits(next);
      setEditingTrack(null);
      await loadLibrary(false);
      showQueueNotice(
        edit
          ? 'Datos de la canción guardados.'
          : 'Datos originales restaurados.',
      );
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudieron guardar los datos',
          'No se pudieron guardar los datos de la canción.',
        ),
      );
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
        describeFailure(
          error,
          'No se pudo guardar el ajuste',
          'No se pudo guardar el ajuste.',
        ),
      );
    }
  }

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
    return () => {
      appStateSubscription.remove();
      librarySubscription.remove();
    };
  }, [loadLibrary]);

  return {
    tracks,
    setTracks,
    tracksById,
    favoriteIds,
    setFavoriteIds,
    toggleFavorite,
    loadingLibrary,
    permissionDenied,
    permissionBlocked,
    requestLibraryAccess,
    loadLibrary,
    hideShortAudio,
    toggleHideShortAudio,
    deviceFolders,
    excludedFolders,
    toggleFolderExcluded,
    trackEdits,
    editingTrack,
    setEditingTrack,
    saveTrackEdit,
  };
}
