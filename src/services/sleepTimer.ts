import TrackPlayer from 'react-native-track-player';

export type SleepTimerState =
  | { mode: 'off' }
  | { mode: 'time'; deadline: number }
  | { mode: 'endOfTrack' };

const trackEndTolerance = 2;

let state: SleepTimerState = { mode: 'off' };
let timeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(next: SleepTimerState) => void>();

function setState(next: SleepTimerState) {
  state = next;
  listeners.forEach(listener => listener(next));
}

function clearTimer() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
}

async function finish() {
  clearTimer();
  setState({ mode: 'off' });
  await TrackPlayer.pause();
}

export function getSleepTimer() {
  return state;
}

export function subscribeSleepTimer(listener: (next: SleepTimerState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startSleepTimer(minutes: number) {
  clearTimer();
  const delay = minutes * 60 * 1000;
  setState({ mode: 'time', deadline: Date.now() + delay });
  timeout = setTimeout(finish, delay);
}

export function stopAtEndOfTrack() {
  clearTimer();
  setState({ mode: 'endOfTrack' });
}

export function cancelSleepTimer() {
  clearTimer();
  setState({ mode: 'off' });
}

/** Android may delay JS timers in the background; progress events still arrive. */
export async function checkSleepTimerDeadline() {
  if (state.mode === 'time' && Date.now() >= state.deadline) {
    await finish();
  }
}

/** Pauses only when a track played to its end, not when the user skipped it. */
export async function handleTrackFinished(
  lastPosition: number,
  lastDuration: number | undefined,
) {
  if (
    state.mode === 'endOfTrack' &&
    lastDuration !== undefined &&
    lastPosition >= lastDuration - trackEndTolerance
  ) {
    await finish();
    await TrackPlayer.seekTo(0);
  }
}
