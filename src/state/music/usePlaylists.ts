import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  createPlaylist,
  deletePlaylist,
  exportM3uFile,
  getPlaylists,
  importM3uFile,
  renamePlaylist,
  setPlaylistTracks,
} from '../../native/musicLibrary';
import type { Playlist, Track } from '../../types/Track';
import { buildM3u, resolveM3u } from '../../domain/m3u';
import { formatTrackCount } from '../../utils/formatTrackCount';
import { describeFailure } from './failure';
import type { Notices } from './useNotices';

/** The playlists, their dialogs, the song picker and M3U files. */
export function usePlaylists({
  tracks,
  tracksById,
  onPlaylistCreated,
  setErrorMessage,
  setRetryableError,
  showQueueNotice,
}: {
  tracks: Track[];
  tracksById: Map<string, Track>;
  onPlaylistCreated?: (playlist: Playlist) => void;
} & Pick<
  Notices,
  'setErrorMessage' | 'setRetryableError' | 'showQueueNotice'
>) {
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
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [playlistUndo, setPlaylistUndo] = useState<{
    playlistId: string;
    trackIds: string[];
  } | null>(null);
  const playlistUndoTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
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

  useEffect(
    () => () => {
      if (playlistUndoTimeout.current) {
        clearTimeout(playlistUndoTimeout.current);
      }
    },
    [],
  );

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await getPlaylists());
    } catch (error) {
      setRetryableError(
        describeFailure(
          error,
          'No se pudieron cargar las listas',
          'No se pudieron cargar las listas de reproducción.',
        ),
        () => loadPlaylists(),
      );
    }
  }, [setRetryableError]);
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
        describeFailure(
          error,
          'No se pudo guardar la lista',
          'No se pudo guardar la lista de reproducción.',
        ),
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
        describeFailure(
          error,
          'No se pudo eliminar la lista',
          'No se pudo eliminar la lista de reproducción.',
        ),
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
        describeFailure(
          error,
          'No se pudieron guardar las canciones',
          'No se pudieron guardar las canciones de la lista.',
        ),
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
        describeFailure(
          error,
          'No se pudo quitar la canción',
          'No se pudo quitar la canción de la lista.',
        ),
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
        describeFailure(
          error,
          'No se pudo cambiar el orden',
          'No se pudo cambiar el orden de la lista.',
        ),
      );
    } finally {
      setSavingPlaylist(false);
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
        describeFailure(error, 'No se pudo deshacer', 'No se pudo deshacer.'),
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
        describeFailure(
          error,
          'No se pudo añadir a la lista',
          'No se pudo añadir a la lista.',
        ),
      );
    }
  }
  async function addTracksToPlaylist(playlist: Playlist, items: Track[]) {
    const existing = new Set(playlist.trackIds);
    const added = items.filter(track => !existing.has(track.id));
    if (added.length === 0) {
      showQueueNotice(`Ya estaban en ${playlist.name}.`);
      return;
    }
    const trackIds = [...playlist.trackIds, ...added.map(track => track.id)];
    try {
      await setPlaylistTracks(playlist.id, trackIds);
      setPlaylists(current =>
        current.map(item =>
          item.id === playlist.id ? { ...item, trackIds } : item,
        ),
      );
      showQueueNotice(`${formatTrackCount(added.length)} en ${playlist.name}.`);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo añadir a la lista',
          'No se pudo añadir a la lista.',
        ),
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
      if (
        trackIds.length === playlist.trackIds.length &&
        imported.missing.length === 0
      ) {
        Alert.alert(
          'Lista vacía',
          'El archivo no contiene canciones nuevas para esta lista.',
        );
        return;
      }
      await setPlaylistTracks(playlist.id, trackIds);
      setPlaylists(current =>
        current.map(item =>
          item.id === playlist.id ? { ...item, trackIds } : item,
        ),
      );
      const skipped =
        imported.duplicates.length + imported.trackIds.length - newIds.length;
      Alert.alert(
        'Importación completada',
        `Añadidas: ${newIds.length}. No encontradas: ${imported.missing.length}. ` +
          `Duplicadas: ${skipped}. Entradas malformadas: ${imported.malformedLines}.`,
      );
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo importar la lista',
          'No se pudo importar el archivo M3U.',
        ),
      );
    }
  }
  async function exportPlaylistM3u(playlist: Playlist) {
    try {
      const playlistTracks = playlist.trackIds
        .map(id => tracksById.get(id))
        .filter((track): track is Track => track !== undefined);
      const safeName =
        playlist.name
          .replace(/[<>:"/\\|?*]/g, '-')
          .split('')
          .map(character => (character.charCodeAt(0) < 32 ? '-' : character))
          .join('')
          .trim() || 'lista';
      const saved = await exportM3uFile(
        `${safeName}.m3u8`,
        buildM3u(playlistTracks),
      );
      if (saved) {
        showQueueNotice('Lista M3U guardada.');
      }
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo exportar la lista',
          'No se pudo exportar el archivo M3U.',
        ),
      );
    }
  }

  return {
    playlists,
    setPlaylists,
    playlistTracksById,
    loadPlaylists,
    savingPlaylist,
    playlistUndo,
    undoPlaylistRemoval,
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
    savePlaylistName,
    confirmDeletePlaylist,
    openPlaylistTrackPicker,
    toggleDraftPlaylistTrack,
    savePlaylistTracks,
    removeTrackFromPlaylist,
    movePlaylistTrack,
    addTrackToPlaylist,
    addTracksToPlaylist,
    importPlaylistFile,
    exportPlaylistM3u,
  };
}
