import TrackPlayer from 'react-native-track-player';
import {
  handlePlaybackFailure,
  resetPlaybackFailures,
} from '../src/services/playbackErrors';

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    pause: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetPlaybackFailures();
});

test('moves on to the next song when one cannot play', async () => {
  await handlePlaybackFailure();

  expect(TrackPlayer.skipToNext).toHaveBeenCalledTimes(1);
  expect(TrackPlayer.play).toHaveBeenCalledTimes(1);
});

test('pauses when the failed song was the last one', async () => {
  jest.mocked(TrackPlayer.skipToNext).mockRejectedValueOnce(new Error('end'));

  await handlePlaybackFailure();

  expect(TrackPlayer.pause).toHaveBeenCalledTimes(1);
});

test('stops trying after three failures in a row', async () => {
  await handlePlaybackFailure();
  await handlePlaybackFailure();
  await handlePlaybackFailure();

  expect(TrackPlayer.skipToNext).toHaveBeenCalledTimes(2);
  expect(TrackPlayer.pause).toHaveBeenCalledTimes(1);
});

test('a song that plays clears the count', async () => {
  await handlePlaybackFailure();
  await handlePlaybackFailure();
  resetPlaybackFailures();
  await handlePlaybackFailure();

  expect(TrackPlayer.skipToNext).toHaveBeenCalledTimes(3);
  expect(TrackPlayer.pause).not.toHaveBeenCalled();
});
