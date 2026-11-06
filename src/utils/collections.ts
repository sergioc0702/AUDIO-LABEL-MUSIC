import type { Playlist, Track } from '../types/Track';
import { normalizeGenre } from './sortTracks';

export type TrackGroup = {
  key: string;
  name: string;
  artist: string;
  artwork: string | null;
  tracks: Track[];
};

export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
}

export function matchesQuery(value: string, query: string) {
  return normalizeText(value).includes(normalizeText(query.trim()));
}

function groupTracks(
  tracks: Track[],
  keyOf: (track: Track) => string,
  nameOf: (track: Track) => string,
): TrackGroup[] {
  const groups = new Map<string, TrackGroup>();
  tracks.forEach(track => {
    const key = keyOf(track);
    const group = groups.get(key);
    if (group) {
      group.tracks.push(track);
      group.artwork = group.artwork ?? track.artwork;
    } else {
      groups.set(key, {
        key,
        name: nameOf(track),
        artist: track.artist,
        artwork: track.artwork,
        tracks: [track],
      });
    }
  });
  return Array.from(groups.values()).sort((first, second) =>
    first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }),
  );
}

export function albumKey(track: Track) {
  return track.albumId && track.albumId !== '0'
    ? `album:${track.albumId}`
    : `album:${track.album}\u0000${track.artist}`;
}

export function artistKey(track: Track) {
  return `artist:${normalizeText(track.artist)}`;
}

export function groupAlbums(tracks: Track[]) {
  return groupTracks(tracks, albumKey, track => track.album);
}

export function groupArtists(tracks: Track[]) {
  return groupTracks(tracks, artistKey, track => track.artist);
}

export function folderName(path: string) {
  return path.split('/').filter(Boolean).pop() ?? 'Almacenamiento interno';
}

export function groupFolders(tracks: Track[]) {
  return groupTracks(
    tracks,
    track => `folder:${track.folder ?? ''}`,
    track => folderName(track.folder ?? ''),
  );
}

export function groupGenres(tracks: Track[]) {
  const withGenre = tracks.filter(track => normalizeGenre(track.genre));
  return groupTracks(
    withGenre,
    track => `genre:${normalizeGenre(track.genre)}`,
    track => normalizeGenre(track.genre),
  );
}

export type CollectionRef =
  | { kind: 'group'; key: string; title: string }
  | { kind: 'playlist'; id: string }
  | { kind: 'favorites' | 'recent' | 'top' | 'added' };

export type ResolvedCollection = {
  title: string;
  tracks: Track[];
  artwork: string | null;
  round: boolean;
  playlist: Playlist | null;
};

export function resolveCollection(
  ref: CollectionRef,
  source: {
    tracks: Track[];
    favoriteIds: ReadonlySet<string>;
    recentTracks: Track[];
    topTracks: Track[];
    playlists: Playlist[];
    playlistTracksById: ReadonlyMap<string, Track[]>;
  },
): ResolvedCollection | null {
  const smart = (title: string, tracks: Track[]): ResolvedCollection => ({
    title,
    tracks,
    artwork: tracks.find(track => track.artwork)?.artwork ?? null,
    round: false,
    playlist: null,
  });

  switch (ref.kind) {
    case 'favorites':
      return smart(
        'Favoritas',
        source.tracks.filter(track => source.favoriteIds.has(track.id)),
      );
    case 'recent':
      return smart('Recientes', source.recentTracks);
    case 'top':
      return smart('Más escuchadas', source.topTracks);
    case 'added':
      return smart(
        'Añadidas recientemente',
        [...source.tracks]
          .sort((first, second) => second.dateAdded - first.dateAdded)
          .slice(0, 50),
      );
    case 'playlist': {
      const playlist = source.playlists.find(item => item.id === ref.id);
      if (!playlist) {
        return null;
      }
      const tracks = source.playlistTracksById.get(playlist.id) ?? [];
      return { ...smart(playlist.name, tracks), playlist };
    }
    case 'group': {
      const prefix = ref.key.split(':')[0];
      const groups =
        prefix === 'album'
          ? groupAlbums(source.tracks)
          : prefix === 'artist'
          ? groupArtists(source.tracks)
          : prefix === 'folder'
          ? groupFolders(source.tracks)
          : groupGenres(source.tracks);
      const group = groups.find(item => item.key === ref.key);
      if (!group) {
        return null;
      }
      return {
        ...smart(ref.title, group.tracks),
        round: prefix === 'artist',
      };
    }
  }
}
