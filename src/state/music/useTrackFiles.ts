import { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  createPlaylist,
  exportBackupFile,
  getPlaylists,
  getStoredLyrics,
  importBackupFile,
  importLrcFile,
  removeStoredLyrics,
  setPlaylistTracks,
  setTrackAsRingtone,
  setTrackFavorite,
  shareTrackFile,
  storeLyrics,
} from '../../native/musicLibrary';
import type { Playlist, Track } from '../../types/Track';
import { buildBackup, matchBackup, readBackup } from '../../domain/backup';
import { parseLrc } from '../../domain/lyrics';
import { formatTrackCount } from '../../utils/formatTrackCount';
import { describeFailure } from './failure';
import type { Notices } from './useNotices';

/**
 * What goes in and out of files: sharing a song, the ringtone, the backup and
 * the lyrics saved on the phone.
 */
export function useTrackFiles({
  tracks,
  favoriteIds,
  setFavoriteIds,
  playlists,
  setPlaylists,
  setQueueTrackDialog,
  setErrorMessage,
  showQueueNotice,
}: {
  tracks: Track[];
  favoriteIds: Set<string>;
  setFavoriteIds: (update: (ids: Set<string>) => Set<string>) => void;
  playlists: Playlist[];
  setPlaylists: (playlists: Playlist[]) => void;
  setQueueTrackDialog: (dialog: null) => void;
} & Pick<Notices, 'setErrorMessage' | 'showQueueNotice'>) {
  async function shareTrack(track: Track) {
    setQueueTrackDialog(null);
    try {
      await shareTrackFile(track.id, track.title);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo compartir la canción',
          'No se pudo compartir la canción.',
        ),
      );
    }
  }
  async function setRingtone(track: Track) {
    setQueueTrackDialog(null);
    try {
      const result = await setTrackAsRingtone(track.id);
      if (result === 'permission') {
        Alert.alert(
          'Permiso necesario',
          'Activa “Modificar ajustes del sistema” para Mi Música en la pantalla que se abrió y vuelve a elegir la canción.',
        );
      } else {
        showQueueNotice(`“${track.title}” es tu tono de llamada.`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el tono de llamada.',
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
        describeFailure(
          error,
          'No se pudo guardar la copia',
          'No se pudo guardar la copia de seguridad.',
        ),
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
        describeFailure(
          error,
          'No se pudo restaurar la copia',
          'No se pudo restaurar la copia de seguridad.',
        ),
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
        Alert.alert(
          'Archivo LRC no válido',
          'El archivo no contiene líneas con marcas de tiempo reconocibles.',
        );
        return false;
      }
      await storeLyrics(track.id, contents);
      showQueueNotice(`Letras guardadas para ${track.title}.`);
      return true;
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudieron guardar las letras',
          'No se pudieron guardar las letras locales.',
        ),
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
        describeFailure(
          error,
          'No se pudieron eliminar las letras',
          'No se pudieron eliminar las letras.',
        ),
      );
      return false;
    }
  }

  return {
    shareTrack,
    setRingtone,
    exportLibraryBackup,
    restoreLibraryBackup,
    importTrackLyrics,
    getTrackLyrics,
    deleteTrackLyrics,
  };
}
