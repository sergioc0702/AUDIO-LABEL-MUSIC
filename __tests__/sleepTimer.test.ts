import TrackPlayer from 'react-native-track-player';
import {
  cancelSleepTimer,
  checkSleepTimerDeadline,
  getSleepTimer,
  handleTrackFinished,
  startSleepTimer,
  stopAtEndOfTrack,
} from '../src/services/sleepTimer';

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    pause: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  cancelSleepTimer();
});

afterEach(() => {
  jest.useRealTimers();
});

test('pauses when the time is up', async () => {
  startSleepTimer(15);

  await jest.advanceTimersByTimeAsync(15 * 60 * 1000);

  expect(TrackPlayer.pause).toHaveBeenCalledTimes(1);
  expect(getSleepTimer()).toEqual({ mode: 'off' });
});

test('progress events catch a deadline that a delayed timer missed', async () => {
  startSleepTimer(15);
  jest.setSystemTime(Date.now() + 16 * 60 * 1000);

  await checkSleepTimerDeadline();

  expect(TrackPlayer.pause).toHaveBeenCalledTimes(1);
});

test('a canceled timer never pauses', async () => {
  startSleepTimer(15);
  cancelSleepTimer();

  await jest.advanceTimersByTimeAsync(20 * 60 * 1000);

  expect(TrackPlayer.pause).not.toHaveBeenCalled();
});

test('pauses when the song ends by itself', async () => {
  stopAtEndOfTrack();

  await handleTrackFinished(199.5, 200);

  expect(TrackPlayer.pause).toHaveBeenCalledTimes(1);
  expect(TrackPlayer.seekTo).toHaveBeenCalledWith(0);
});

test('keeps waiting when the user skips the song', async () => {
  stopAtEndOfTrack();

  await handleTrackFinished(30, 200);

  expect(TrackPlayer.pause).not.toHaveBeenCalled();
  expect(getSleepTimer()).toEqual({ mode: 'endOfTrack' });
});
