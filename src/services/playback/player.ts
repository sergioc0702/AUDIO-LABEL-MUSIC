import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player';
import { buildQueueMoves } from '../../domain/shuffleQueue';
import type { Track } from '../../types/Track';

const restartThreshold = 3;
/** How far the jump buttons move within a song. */
export const jumpSeconds = 10;

export async function setupPlayer(): Promise<void> {
  const serviceRunning = await TrackPlayer.isServiceRunning();
  if (!serviceRunning) {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  }

  await TrackPlayer.updateOptions(playerOptions(false));
}

/**
 * The buttons of the notification and the lock screen. A long audio swaps
 * previous and next for jumps of a few seconds.
 */
function playerOptions(longAudio: boolean) {
  const moves = longAudio
    ? [Capability.JumpBackward, Capability.JumpForward]
    : [Capability.SkipToPrevious, Capability.SkipToNext];
  return {
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.JumpBackward,
      Capability.JumpForward,
      Capability.SeekTo,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, moves[1]],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      ...moves,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 5,
    forwardJumpInterval: jumpSeconds,
    backwardJumpInterval: jumpSeconds,
  };
}

let longAudioControls = false;

/** Shows jump buttons instead of previous and next while a long audio plays. */
export async function setLongAudioControls(longAudio: boolean): Promise<void> {
  if (longAudio === longAudioControls) {
    return;
  }
  longAudioControls = longAudio;
  await TrackPlayer.updateOptions(playerOptions(longAudio));
}

export function toPlayerTrack(track: Track) {
  return {
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: track.artwork ?? undefined,
    duration: track.duration,
  };
}

export async function getPlayerQueue() {
  return TrackPlayer.getQueue();
}

export async function getActivePlayerTrackIndex() {
  return TrackPlayer.getActiveTrackIndex();
}

export async function getPlayerRepeatMode(): Promise<RepeatMode> {
  return TrackPlayer.getRepeatMode();
}

export async function setPlayerRate(rate: number): Promise<void> {
  await TrackPlayer.setRate(rate);
}

export async function seekPlayerTo(position: number): Promise<void> {
  await TrackPlayer.seekTo(position);
}

export async function jumpPlayerBy(seconds: number): Promise<void> {
  await TrackPlayer.seekBy(seconds);
}

export async function replacePlayerQueue(
  tracks: Track[],
  selectedIndex: number,
): Promise<void> {
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks.map(toPlayerTrack));
  await TrackPlayer.skip(selectedIndex);
  await TrackPlayer.play();
}

export async function addPlayerTrack(
  track: Track,
  index?: number,
): Promise<void> {
  await TrackPlayer.add(toPlayerTrack(track), index);
}

export async function removeUpcomingPlayerTracks(): Promise<void> {
  await TrackPlayer.removeUpcomingTracks();
}

export async function resetPlayerQueue(): Promise<void> {
  await TrackPlayer.reset();
}

export async function playPlayer(): Promise<void> {
  await TrackPlayer.play();
}

export async function pausePlayer(): Promise<void> {
  await TrackPlayer.pause();
}

/** Changing song always plays it, even if the music was paused. */
export async function skipToNextPlayerTrack(): Promise<void> {
  await TrackPlayer.skipToNext();
  await TrackPlayer.play();
}

/** Past the first seconds of a song, "previous" means start it again. */
export async function skipToPreviousPlayerTrack(): Promise<void> {
  const { position } = await TrackPlayer.getProgress();
  if (position > restartThreshold) {
    await TrackPlayer.seekTo(0);
  } else {
    await TrackPlayer.skipToPrevious();
  }
  await TrackPlayer.play();
}

export async function skipToPlayerTrack(index: number): Promise<void> {
  await TrackPlayer.skip(index);
}

export async function setPlayerRepeatMode(mode: RepeatMode): Promise<void> {
  await TrackPlayer.setRepeatMode(mode);
}

export async function movePlayerTrack(
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  await TrackPlayer.move(fromIndex, toIndex);
}

export async function movePlayerTracks(
  moves: Array<{ from: number; to: number }>,
  expectedQueueIds: string[],
  expectedActiveTrackId: string,
): Promise<void> {
  await TrackPlayer.moveTracks(moves, expectedQueueIds, expectedActiveTrackId);
}

/**
 * Puts the songs after the current one in the order of targetIds; songs
 * missing from it keep their place at the end.
 */
export async function reorderUpcomingTracks(
  targetIds: string[],
  currentIds: string[],
  activeIndex: number,
) {
  if (activeIndex < 0 || activeIndex >= currentIds.length) {
    throw new Error('No se pudo identificar la canción que está sonando.');
  }
  const activeId = currentIds[activeIndex];
  const start = activeIndex + 1;
  const currentUpcoming = currentIds.slice(start);
  const currentUpcomingSet = new Set(currentUpcoming);
  const desiredUpcoming = targetIds.filter(id => currentUpcomingSet.has(id));
  const desiredUpcomingSet = new Set(desiredUpcoming);
  const desiredIds = [
    ...currentIds.slice(0, start),
    ...desiredUpcoming,
    ...currentUpcoming.filter(id => !desiredUpcomingSet.has(id)),
  ];
  const moves = buildQueueMoves(currentIds, desiredIds, start);
  if (moves.length === 0) {
    return;
  }

  // The native player validates this exact snapshot and applies the whole
  // move list in one main-thread call, so playback cannot advance between moves.
  await movePlayerTracks(moves, currentIds, activeId);
}

export async function removePlayerTrack(index: number): Promise<void> {
  await TrackPlayer.remove(index);
}

export function onPlayerError(listener: () => void) {
  return TrackPlayer.addEventListener(Event.PlaybackError, listener);
}
