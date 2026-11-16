import TrackPlayer, { Event, State } from 'react-native-track-player';
import { handlePlaybackFailure, resetPlaybackFailures } from './playbackErrors';
import { jumpSeconds, skipToPreviousPlayerTrack } from './player';
import { rememberPosition, resumeIfLong } from './resumePositions';
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
    skipToPreviousPlayerTrack(),
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, event =>
    TrackPlayer.seekTo(event.position),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () =>
    TrackPlayer.seekBy(jumpSeconds),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () =>
    TrackPlayer.seekBy(-jumpSeconds),
  );
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, event => {
    if (event.lastTrack) {
      handleTrackFinished(event.lastPosition, event.lastTrack.duration).catch(
        ignoreFailure,
      );
      rememberPosition(
        String(event.lastTrack.id),
        event.lastPosition,
        event.lastTrack.duration,
      ).catch(ignoreFailure);
    }
    if (event.track) {
      resumeIfLong(String(event.track.id), event.track.duration).catch(
        ignoreFailure,
      );
    }
    saveSession().catch(ignoreFailure);
  });
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, event => {
    checkSleepTimerDeadline().catch(ignoreFailure);
    TrackPlayer.getActiveTrack()
      .then(track =>
        track
          ? rememberPosition(String(track.id), event.position, track.duration)
          : undefined,
      )
      .catch(ignoreFailure);
    saveSession().catch(ignoreFailure);
  });
  TrackPlayer.addEventListener(Event.PlaybackState, event => {
    if (event.state === State.Paused) {
      saveSession().catch(ignoreFailure);
    }
    if (event.state === State.Playing) {
      resetPlaybackFailures();
    }
  });
  TrackPlayer.addEventListener(Event.PlaybackError, () => {
    handlePlaybackFailure().catch(ignoreFailure);
  });
}
