import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  clearPlaybackHistory,
  getRecentPlayback,
  getTopPlayed,
} from '../../native/musicLibrary';
import type { RecentPlayback, TopPlayed, Track } from '../../types/Track';
import { describeFailure } from './failure';
import type { Notices } from './useNotices';

/** What was heard lately and what is heard the most. */
export function usePlaybackHistory({
  tracksById,
  setErrorMessage,
  setRetryableError,
}: {
  tracksById: Map<string, Track>;
} & Pick<Notices, 'setErrorMessage' | 'setRetryableError'>) {
  const [recentPlayback, setRecentPlayback] = useState<RecentPlayback[]>([]);
  const [topPlayed, setTopPlayed] = useState<TopPlayed[]>([]);
  const recentTracks = useMemo(
    () =>
      recentPlayback
        .map(entry => tracksById.get(entry.trackId))
        .filter((track): track is Track => track !== undefined),
    [recentPlayback, tracksById],
  );
  const topTracks = useMemo(
    () =>
      topPlayed
        .map(entry => tracksById.get(entry.trackId))
        .filter((track): track is Track => track !== undefined),
    [topPlayed, tracksById],
  );

  const loadPlaybackHistory = useCallback(async () => {
    try {
      const [recent, top] = await Promise.all([
        getRecentPlayback(),
        getTopPlayed(),
      ]);
      setRecentPlayback(recent);
      setTopPlayed(top);
    } catch (error) {
      setRetryableError(
        describeFailure(
          error,
          'No se pudo cargar el historial',
          'No se pudo cargar el historial de reproducción.',
        ),
        () => loadPlaybackHistory(),
      );
    }
  }, [setRetryableError]);
  async function clearRecentPlayback() {
    Alert.alert(
      'Borrar historial',
      'Se eliminará el historial de reproducción reciente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            clearPlaybackHistory()
              .then(() => {
                setRecentPlayback([]);
                setTopPlayed([]);
              })
              .catch(error => {
                setErrorMessage(
                  describeFailure(
                    error,
                    'No se pudo borrar el historial',
                    'No se pudo borrar el historial de reproducción.',
                  ),
                );
              });
          },
        },
      ],
    );
  }

  return {
    recentPlayback,
    setRecentPlayback,
    topPlayed,
    setTopPlayed,
    recentTracks,
    topTracks,
    loadPlaybackHistory,
    clearRecentPlayback,
  };
}
