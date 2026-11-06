import type { Playlist, Track } from '../types/Track';
import { normalizeText } from './collections';

type BackupTrack = { title: string; artist: string };

export type LibraryBackup = {
  version: 1;
  favorites: BackupTrack[];
  playlists: { name: string; tracks: BackupTrack[] }[];
};

function toBackupTrack({ title, artist }: Track): BackupTrack {
  return { title, artist };
}

function trackKey({ title, artist }: BackupTrack) {
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
  return typeof track?.title === 'string' && typeof track?.artist === 'string';
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
  const idsByKey = new Map(
    tracks.map(track => [trackKey(track), track.id] as const),
  );
  const missing = new Set<string>();
  const findIds = (saved: BackupTrack[]) =>
    saved.flatMap(track => {
      const id = idsByKey.get(trackKey(track));
      if (id === undefined) {
        missing.add(trackKey(track));
        return [];
      }
      return [id];
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
