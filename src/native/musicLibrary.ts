import { NativeModules } from 'react-native';
import type { Appearance } from '../theme/themes';
import type {
  Playlist,
  RecentPlayback,
  TopPlayed,
  Track,
} from '../types/Track';

type MusicLibraryModule = {
  getTracks(): Promise<Track[]>;
  getFavoriteTrackIds(): Promise<string[]>;
  setTrackFavorite(trackId: string, isFavorite: boolean): Promise<void>;
  deleteTrack(trackId: string): Promise<boolean>;
  getPlaylists(): Promise<Playlist[]>;
  createPlaylist(name: string): Promise<Playlist>;
  renamePlaylist(playlistId: string, name: string): Promise<void>;
  deletePlaylist(playlistId: string): Promise<void>;
  setPlaylistTracks(playlistId: string, trackIds: string[]): Promise<void>;
  recordPlaybackHistory(trackId: string): Promise<void>;
  getRecentPlayback(): Promise<RecentPlayback[]>;
  getTopPlayed(): Promise<TopPlayed[]>;
  clearPlaybackHistory(): Promise<void>;
  saveSession(session: string): Promise<void>;
  getSession(): Promise<string | null>;
  saveAppearance(appearance: string): Promise<void>;
  getAppearance(): Promise<string | null>;
  getPlaybackRate(): Promise<number>;
  setPlaybackRate(rate: number): Promise<void>;
  getEqualizerSettings(): Promise<EqualizerSettings>;
  setEqualizerSettings(enabled: boolean, bandGainsDb: number[]): Promise<void>;
};

export type EqualizerSettings = {
  enabled: boolean;
  bandGainsDb: number[];
};

const musicLibrary = NativeModules.MusicLibrary as
  | MusicLibraryModule
  | undefined;

export function getDeviceTracks(): Promise<Track[]> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }

  return musicLibrary.getTracks().then(nativeTracks => {
    const artworkByAlbum = new Map<string, string>();
    nativeTracks.forEach(track => {
      if (track.artwork) {
        artworkByAlbum.set(track.albumId, track.artwork);
      }
    });

    return nativeTracks.map(track => ({
      ...track,
      artwork: track.artwork ?? artworkByAlbum.get(track.albumId) ?? null,
    }));
  });
}

export function getFavoriteTrackIds(): Promise<string[]> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getFavoriteTrackIds();
}

export function setTrackFavorite(
  trackId: string,
  isFavorite: boolean,
): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.setTrackFavorite(trackId, isFavorite);
}

export function deleteTrackFromDevice(trackId: string): Promise<boolean> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.deleteTrack(trackId);
}

export function getPlaylists(): Promise<Playlist[]> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getPlaylists();
}

export function createPlaylist(name: string): Promise<Playlist> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.createPlaylist(name);
}

export function renamePlaylist(
  playlistId: string,
  name: string,
): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.renamePlaylist(playlistId, name);
}

export function deletePlaylist(playlistId: string): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.deletePlaylist(playlistId);
}

export function setPlaylistTracks(
  playlistId: string,
  trackIds: string[],
): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.setPlaylistTracks(playlistId, trackIds);
}

export function recordPlaybackHistory(trackId: string): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.recordPlaybackHistory(trackId);
}

export function getRecentPlayback(): Promise<RecentPlayback[]> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getRecentPlayback();
}

export function getTopPlayed(): Promise<TopPlayed[]> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getTopPlayed();
}

export function storeSession(session: string): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.saveSession(session);
}

export function getStoredSession(): Promise<string | null> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getSession();
}

export function storeAppearance(appearance: Appearance): Promise<void> {
  if (!musicLibrary) {
    return Promise.resolve();
  }
  return musicLibrary.saveAppearance(JSON.stringify(appearance));
}

export async function getStoredAppearance(): Promise<Partial<Appearance> | null> {
  const stored = await musicLibrary?.getAppearance();
  return stored ? JSON.parse(stored) : null;
}

export function clearPlaybackHistory(): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.clearPlaybackHistory();
}

export function getPlaybackRate(): Promise<number> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getPlaybackRate();
}

export function setPlaybackRate(rate: number): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.setPlaybackRate(rate);
}

export function getEqualizerSettings(): Promise<EqualizerSettings> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.getEqualizerSettings();
}

export function setEqualizerSettings(
  enabled: boolean,
  bandGainsDb: number[],
): Promise<void> {
  if (!musicLibrary) {
    throw new Error('El módulo nativo de música no está disponible.');
  }
  return musicLibrary.setEqualizerSettings(enabled, bandGainsDb);
}
