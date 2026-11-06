import TrackPlayer from 'react-native-track-player';

const maxFailuresInARow = 3;

let failures = 0;

export function resetPlaybackFailures() {
  failures = 0;
}

/** Moves past a file that cannot play, and gives up if several fail in a row. */
export async function handlePlaybackFailure() {
  failures += 1;
  if (failures >= maxFailuresInARow) {
    failures = 0;
    await TrackPlayer.pause();
    return;
  }
  try {
    await TrackPlayer.skipToNext();
    await TrackPlayer.play();
  } catch {
    await TrackPlayer.pause();
  }
}
