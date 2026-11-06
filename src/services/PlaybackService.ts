import TrackPlayer, { Event, State } from 'react-native-track-player';
import { saveSession } from './session';
import { checkSleepTimerDeadline, handleTrackFinished } from './sleepTimer';

const ignoreFailure = () => undefined;

export default async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext(),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious(),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, event =>
    TrackPlayer.seekTo(event.position),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () =>
    TrackPlayer.seekBy(15),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () =>
    TrackPlayer.seekBy(-15),
  );
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, event => {
    if (event.lastTrack) {
      handleTrackFinished(event.lastPosition, event.lastTrack.duration).catch(
        ignoreFailure,
      );
    }
    saveSession().catch(ignoreFailure);
  });
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => {
    checkSleepTimerDeadline().catch(ignoreFailure);
    saveSession().catch(ignoreFailure);
  });
  TrackPlayer.addEventListener(Event.PlaybackState, event => {
    if (event.state === State.Paused) {
      saveSession().catch(ignoreFailure);
    }
  });
}
