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
  folder?: string | null;
  filePath?: string | null;
};

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

export type TopPlayed = {
  trackId: string;
  plays: number;
};
