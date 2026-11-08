import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useProgress } from 'react-native-track-player';
import { useApp } from '../state/AppContext';

const ProgressContext = createContext({ position: 0, duration: 0 });

/** The mini player, scrubber and lyrics all read the same native sample. */
export function PlaybackProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { music, playerSheet } = useApp();
  const { currentTrack, playerExpanded, rememberPlaybackPosition } = music;
  const { position, duration } = useProgress(
    playerExpanded || playerSheet === 'lyrics' ? 250 : 1000,
  );
  const value = useMemo(
    () => ({
      position: currentTrack ? position : 0,
      duration: currentTrack ? duration || currentTrack.duration : 0,
    }),
    [currentTrack, duration, position],
  );

  useEffect(() => {
    rememberPlaybackPosition(value.position);
  }, [rememberPlaybackPosition, value.position]);

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function usePlaybackProgress() {
  return useContext(ProgressContext);
}
