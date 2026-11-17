import { DeviceEventEmitter } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { setNotificationShuffle } from '../../native/musicLibrary';
import {
  restoreUpcomingTrackOrder,
  shuffleUpcomingTracks,
} from '../../domain/shuffleQueue';
import { reorderUpcomingTracks } from './player';
import {
  getSessionDetails,
  rememberSessionDetails,
  saveSession,
} from './session';

/**
 * The shuffle button of the widget and the notification. While the app's
 * screens are open they handle it (they also update what is on screen);
 * with the app closed, the playback service shuffles the queue itself.
 */
let screensOpen = 0;

/** Taps wait for the previous one, so two quick taps toggle twice. */
let pendingToggle: Promise<void> = Promise.resolve();

/** The screens take over shuffle taps until the returned function runs. */
export function claimRemoteShuffle() {
  screensOpen += 1;
  return () => {
    screensOpen -= 1;
  };
}

export function onBackgroundShuffle() {
  DeviceEventEmitter.addListener(
    'notificationAction',
    (event: { action: string }) => {
      if (event.action === 'shuffle' && screensOpen === 0) {
        pendingToggle = pendingToggle
          .then(toggleShuffleInBackground)
          // The button already flipped: show the real state if this failed.
          .catch(() => setNotificationShuffle(getSessionDetails().shuffle));
      }
    },
  );
}

async function toggleShuffleInBackground() {
  const details = getSessionDetails();
  const next = !details.shuffle;
  const queue = (await TrackPlayer.getQueue()).map(item => ({
    id: String(item.id),
  }));
  const activeIndex = (await TrackPlayer.getActiveTrackIndex()) ?? -1;
  const active = queue[activeIndex];
  if (!active) {
    setNotificationShuffle(details.shuffle);
    return;
  }
  const currentIds = queue.map(item => item.id);
  const target = next
    ? shuffleUpcomingTracks(queue, active.id)
    : restoreUpcomingTrackOrder(
        queue,
        details.originalTrackIds.map(id => ({ id })),
        active.id,
      );
  await reorderUpcomingTracks(
    target.map(item => item.id),
    currentIds,
    activeIndex,
  );
  rememberSessionDetails({
    shuffle: next,
    originalTrackIds: next ? currentIds : [],
  });
  setNotificationShuffle(next);
  await saveSession();
}
