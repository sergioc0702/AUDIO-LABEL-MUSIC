export type Track = {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  genre?: string | null;
  year?: number | null;
  duration: number;
  dateAdded: number;
  artwork: string | null;
};

export type LibraryTab =
  | 'songs'
  | 'albums'
  | 'artists'
  | 'playlists'
  | 'recent';

export type Playlist = {
  id: string;
  name: string;
  createdAt: number;
  trackIds: string[];
};

export type RecentPlayback = {
  trackId: string;
  playedAt: number;
};
