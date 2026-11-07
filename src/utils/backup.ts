import type { Playlist, Track } from '../types/Track';
import { normalizeText } from './collections';

type BackupTrack = { title: string; artist: string; album?: string };

export type LibraryBackup = {
  version: 1;
  favorites: BackupTrack[];
  playlists: { name: string; tracks: BackupTrack[] }[];
};

function toBackupTrack({ title, artist, album }: Track): BackupTrack {
  return { title, artist, album };
}

function trackKey({ title, artist, album }: BackupTrack) {
  return `${normalizeText(title)}|${normalizeText(artist)}|${normalizeText(album ?? '')}`;
}

function legacyTrackKey({ title, artist }: BackupTrack) {
  return `${normalizeText(title)}|${normalizeText(artist)}`;
}

/** Saves songs by name: their ids change from one phone to another. */
export function buildBackup(
  tracks: Track[],
  favoriteIds: Set<string>,
  playlists: Playlist[],
): LibraryBackup {
  const tracksById = new Map(tracks.map(track => [track.id, track]));
  return {
    version: 1,
    favorites: tracks
      .filter(track => favoriteIds.has(track.id))
      .map(toBackupTrack),
    playlists: playlists.map(playlist => ({
      name: playlist.name,
      tracks: playlist.trackIds
        .map(id => tracksById.get(id))
        .filter((track): track is Track => track !== undefined)
        .map(toBackupTrack),
    })),
  };
}

function isBackupTrack(value: unknown): value is BackupTrack {
  const track = value as BackupTrack | null;
  return (
    typeof track?.title === 'string' &&
    typeof track?.artist === 'string' &&
    (track.album === undefined || typeof track.album === 'string')
  );
}

export function readBackup(text: string): LibraryBackup | null {
  let backup: LibraryBackup;
  try {
    backup = JSON.parse(text);
  } catch {
    return null;
  }
  const valid =
    backup?.version === 1 &&
    Array.isArray(backup.favorites) &&
    backup.favorites.every(isBackupTrack) &&
    Array.isArray(backup.playlists) &&
    backup.playlists.every(
      playlist =>
        typeof playlist?.name === 'string' &&
        playlist.name.trim().length > 0 &&
        Array.isArray(playlist.tracks) &&
        playlist.tracks.every(isBackupTrack),
    );
  return valid ? backup : null;
}

/** Finds the saved songs in this library. Those not on this phone are counted. */
export function matchBackup(backup: LibraryBackup, tracks: Track[]) {
  const idsByKey = new Map<string, string[]>();
  const idsByLegacyKey = new Map<string, string[]>();
  tracks.forEach(track => {
    const fullKey = trackKey(track);
    const legacyKey = legacyTrackKey(track);
    idsByKey.set(fullKey, [...(idsByKey.get(fullKey) ?? []), track.id]);
    idsByLegacyKey.set(legacyKey, [
      ...(idsByLegacyKey.get(legacyKey) ?? []),
      track.id,
    ]);
  });
  const missing = new Set<string>();
  const findIds = (saved: BackupTrack[]) =>
    saved.flatMap(track => {
      const key = track.album === undefined ? legacyTrackKey(track) : trackKey(track);
      const ids =
        track.album === undefined
          ? idsByLegacyKey.get(key)
          : idsByKey.get(key);
      if (ids?.length !== 1) {
        missing.add(key);
        return [];
      }
      return ids;
    });

  return {
    favoriteIds: findIds(backup.favorites),
    playlists: backup.playlists.map(playlist => ({
      name: playlist.name.trim(),
      trackIds: findIds(playlist.tracks),
    })),
    missingCount: missing.size,
  };
}
