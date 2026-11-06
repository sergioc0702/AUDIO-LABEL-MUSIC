import TrackPlayer, { Capability, RepeatMode } from 'react-native-track-player';
import type { Track } from '../types/Track';

export async function setupPlayer(): Promise<void> {
  const serviceRunning = await TrackPlayer.isServiceRunning();
  if (!serviceRunning) {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  }

  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    forwardJumpInterval: 15,
    backwardJumpInterval: 15,
  });
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

export async function skipToNextPlayerTrack(): Promise<void> {
  await TrackPlayer.skipToNext();
}

export async function skipToPreviousPlayerTrack(): Promise<void> {
  await TrackPlayer.skipToPrevious();
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

export async function removePlayerTrack(index: number): Promise<void> {
  await TrackPlayer.remove(index);
}
