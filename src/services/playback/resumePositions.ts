import TrackPlayer from 'react-native-track-player';
import {
  getStoredPreference,
  storePreference,
} from '../../native/musicLibrary';

/** From this length on, an audio is treated like a podcast or an audiobook. */
export const longAudioSeconds = 20 * 60;

const storageKey = 'resumePositions';
const maxEntries = 100;
/** Too close to the start or the end, there is nothing worth resuming. */
const startMargin = 15;
const endMargin = 30;

type Entry = { position: number; savedAt: number };

let entries: Record<string, Entry> | null = null;
let skipOnce: string | null = null;
const listeners = new Set<(position: number) => void>();

async function load() {
  if (entries) {
    return entries;
  }
  try {
    const parsed = JSON.parse((await getStoredPreference(storageKey)) ?? '{}');
    entries = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    entries = {};
  }
  return entries as Record<string, Entry>;
}

async function persist(all: Record<string, Entry>) {
  const ids = Object.keys(all);
  if (ids.length > maxEntries) {
    ids
      .sort((first, second) => all[first].savedAt - all[second].savedAt)
      .slice(0, ids.length - maxEntries)
      .forEach(id => delete all[id]);
  }
  await storePreference(storageKey, JSON.stringify(all));
}

/** Where to continue a long audio, or null when it should start over. */
export function resumeTarget(
  saved: number | undefined,
  duration: number | undefined,
): number | null {
  if (
    saved === undefined ||
    duration === undefined ||
    duration < longAudioSeconds ||
    saved < startMargin ||
    saved > duration - endMargin
  ) {
    return null;
  }
  return saved;
}

/** Called while a song plays: long audios keep their place for next time. */
export async function rememberPosition(
  trackId: string,
  position: number,
  duration: number | undefined,
) {
  if (duration === undefined || duration < longAudioSeconds) {
    return;
  }
  const all = await load();
  if (position > duration - endMargin) {
    if (!all[trackId]) {
      return;
    }
    delete all[trackId];
  } else if (position >= startMargin) {
    all[trackId] = { position, savedAt: Date.now() };
  } else {
    return;
  }
  await persist(all);
}

/** The restored session already places its song; do not move it again. */
export function skipNextResume(trackId: string) {
  skipOnce = trackId;
}

export function onResumed(listener: (position: number) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called when a song starts: a long audio continues where it was left. */
export async function resumeIfLong(
  trackId: string,
  duration: number | undefined,
) {
  if (skipOnce === trackId) {
    skipOnce = null;
    return;
  }
  skipOnce = null;
  const all = await load();
  const target = resumeTarget(all[trackId]?.position, duration);
  if (target === null) {
    return;
  }
  const { position } = await TrackPlayer.getProgress();
  // The person already moved within the audio: leave it there.
  if (position > startMargin) {
    return;
  }
  await TrackPlayer.seekTo(target);
  listeners.forEach(listener => listener(target));
}
