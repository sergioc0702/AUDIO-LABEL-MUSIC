import { useCallback, useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import {
  getMediaVolume,
  setMediaVolume,
  startVolumeUpdates,
  stopVolumeUpdates,
  type MediaVolume,
} from '../native/musicLibrary';

const POLL_MS = 1000;

/**
 * The phone's media volume while `active`. A system broadcast reports changes
 * at once; polling once a second covers phones where it never arrives.
 */
export function useMediaVolume(active: boolean) {
  const [volume, setVolume] = useState<MediaVolume>({
    level: 0.5,
    fixed: false,
  });

  useEffect(() => {
    if (!active) {
      return;
    }
    let alive = true;
    const read = () => {
      if (AppState.currentState === 'background') {
        return;
      }
      getMediaVolume()
        .then(next => {
          if (alive) {
            setVolume(current =>
              current.level === next.level && current.fixed === next.fixed
                ? current
                : next,
            );
          }
        })
        .catch(() => undefined);
    };
    read();
    startVolumeUpdates();
    const subscription = DeviceEventEmitter.addListener(
      'mediaVolumeChanged',
      (next: MediaVolume) => {
        if (alive) {
          setVolume(next);
        }
      },
    );
    const timer = setInterval(read, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      subscription.remove();
      stopVolumeUpdates();
    };
  }, [active]);

  const change = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolume(current =>
      current.fixed ? current : { ...current, level: clamped },
    );
    setMediaVolume(clamped)
      .then(setVolume)
      .catch(() => undefined);
  }, []);

  return { ...volume, change };
}
