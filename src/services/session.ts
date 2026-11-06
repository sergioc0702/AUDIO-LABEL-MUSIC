import TrackPlayer, { RepeatMode } from 'react-native-track-player';
import { getStoredSession, storeSession } from '../native/musicLibrary';
import type { Track } from '../types/Track';
import { toPlayerTrack } from './player';

export type PlaybackSession = {
  trackIds: string[];
  originalTrackIds: string[];
  index: number;
  position: number;
  sourceLabel: string;
  shuffle: boolean;
  repeatMode: RepeatMode;
};

type SessionDetails = Pick<
  PlaybackSession,
  'originalTrackIds' | 'sourceLabel' | 'shuffle'
>;

let details: SessionDetails = {
  originalTrackIds: [],
  sourceLabel: 'Tu biblioteca',
  shuffle: false,
};

/** Keeps what the player itself does not know, for the next save. */
export function rememberSessionDetails(next: Partial<SessionDetails>) {
  details = { ...details, ...next };
}

export async function saveSession() {
  const [queue, index, progress, repeatMode] = await Promise.all([
    TrackPlayer.getQueue(),
    TrackPlayer.getActiveTrackIndex(),
    TrackPlayer.getProgress(),
    TrackPlayer.getRepeatMode(),
  ]);
  if (queue.length === 0 || index === undefined) {
    return;
  }
  const session: PlaybackSession = {
    ...details,
    trackIds: queue.map(item => String(item.id)),
    index,
    position: progress.position,
    repeatMode,
  };
  await storeSession(JSON.stringify(session));
}

export async function readSession(): Promise<PlaybackSession | null> {
  const stored = await getStoredSession();
  if (!stored) {
    return null;
  }
  try {
    const session = JSON.parse(stored) as PlaybackSession;
    return Array.isArray(session.trackIds) ? session : null;
  } catch {
    return null;
  }
}

/**
 * Loads a saved queue without starting playback. Tracks deleted since the
 * session was saved are skipped. Returns the tracks that could be restored.
 */
export async function restoreSession(
  session: PlaybackSession,
  tracks: Track[],
): Promise<Track[]> {
  const tracksById = new Map(tracks.map(track => [track.id, track]));
  const queue = session.trackIds
    .map(id => tracksById.get(id))
    .filter((track): track is Track => track !== undefined);
  if (queue.length === 0) {
    return [];
  }
  const activeId = session.trackIds[session.index];
  const activeIndex = queue.findIndex(track => track.id === activeId);

  await TrackPlayer.setPlayWhenReady(false);
  await TrackPlayer.add(queue.map(toPlayerTrack));
  if (activeIndex >= 0) {
    await TrackPlayer.skip(activeIndex, session.position);
  }
  await TrackPlayer.setRepeatMode(session.repeatMode ?? RepeatMode.Off);
  rememberSessionDetails({
    originalTrackIds: session.originalTrackIds ?? session.trackIds,
    sourceLabel: session.sourceLabel,
    shuffle: session.shuffle,
  });
  return queue;
}
