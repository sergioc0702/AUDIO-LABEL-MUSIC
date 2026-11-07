import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RepeatMode } from 'react-native-track-player';
import { useApp } from '../../state/AppContext';
import { formatTime } from '../../utils/formatTime';
import { usePlaybackProgress } from '../PlaybackProgress';
import { useSleepTimer } from '../Sheets';

export type SkinProps = {
  covered: boolean;
  headerGesture: ReturnType<typeof Gesture.Pan>;
  onClose: () => void;
};

/** Everything a themed player needs, so each one only draws. */
export function usePlayerKit({ covered }: { covered: boolean }) {
  const { music, setPlayerSheet } = useApp();
  const {
    currentTrack: track,
    playerExpanded,
    playbackSourceLabel,
    favoriteIds,
    toggleFavorite,
    seekToPosition,
    playerReady,
    shuffleEnabled,
    queueUpdating,
    toggleShuffle,
    skipTrack,
    isPlaying,
    togglePlayback,
    repeatMode,
    cycleRepeatMode,
    playbackRate,
    equalizerSettings,
    playbackQueue,
    setQueueVisible,
    setQueueTrackDialog,
  } = music;
  const { position, duration } = usePlaybackProgress();
  const { timer, secondsLeft } = useSleepTimer();
  const pending = useRef(false);

  async function change(direction: 'next' | 'previous') {
    if (pending.current || !playerReady || queueUpdating || covered) return;
    pending.current = true;
    try {
      await skipTrack(direction);
    } finally {
      pending.current = false;
    }
  }

  const favorite = track ? favoriteIds.has(track.id) : false;
  const index = track
    ? playbackQueue.findIndex(item => item.id === track.id)
    : -1;
  const sleepCaption =
    timer.mode === 'time'
      ? formatTime(secondsLeft)
      : timer.mode === 'endOfTrack'
      ? 'Al terminar'
      : 'Dormir';

  return {
    track,
    sourceLabel: playbackSourceLabel,
    /** Visible, playing and not under a sheet: animations may run. */
    lively: isPlaying && playerExpanded && !covered,
    visible: playerExpanded && !covered,
    isPlaying,
    ready: playerReady,
    busy: queueUpdating,
    favorite,
    toggleFavorite: () => track && toggleFavorite(track),
    shuffle: shuffleEnabled,
    toggleShuffle,
    repeatMode,
    repeatOn: repeatMode !== RepeatMode.Off,
    repeatLabel:
      repeatMode === RepeatMode.Off
        ? 'Activar repetir canción'
        : repeatMode === RepeatMode.Track
        ? 'Activar repetir cola'
        : 'Desactivar repetición',
    cycleRepeat: cycleRepeatMode,
    toggle: togglePlayback,
    next: () => change('next'),
    previous: () => change('previous'),
    position,
    duration,
    progress: duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0,
    seekTo: (ratio: number) => {
      if (duration > 0 && playerReady) {
        seekToPosition(Math.max(0, Math.min(1, ratio)) * duration);
      }
    },
    queueCount: playbackQueue.length,
    queueIndex: index,
    rate: playbackRate,
    equalizerOn: equalizerSettings.enabled,
    sleepOn: timer.mode !== 'off',
    sleepCaption,
    openQueue: () => setQueueVisible(true),
    openLyrics: () => setPlayerSheet('lyrics'),
    openSleep: () => setPlayerSheet('sleep'),
    openSpeed: () => setPlayerSheet('speed'),
    openEqualizer: () => setPlayerSheet('equalizer'),
    openMenu: () => track && setQueueTrackDialog({ track, fromLibrary: true }),
  };
}

export type PlayerKit = ReturnType<typeof usePlayerKit>;

/** The tools every player offers, in the same order. */
export function playerTools(kit: PlayerKit) {
  return [
    {
      key: 'queue',
      caption: `Cola · ${kit.queueCount}`,
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      active: false,
      onPress: kit.openQueue,
    },
    {
      key: 'lyrics',
      caption: 'Letras',
      label: `Abrir letras de ${kit.track?.title ?? 'la canción'}`,
      active: false,
      onPress: kit.openLyrics,
    },
    {
      key: 'sleep',
      caption: kit.sleepCaption,
      label: 'Configurar temporizador de apagado',
      active: kit.sleepOn,
      onPress: kit.openSleep,
    },
    {
      key: 'speed',
      caption: `${kit.rate}×`,
      label: `Velocidad de reproducción ${kit.rate}×`,
      active: kit.rate !== 1,
      onPress: kit.openSpeed,
    },
    {
      key: 'equalizer',
      caption: 'Ecualizador',
      label: 'Abrir ecualizador',
      active: kit.equalizerOn,
      onPress: kit.openEqualizer,
    },
  ];
}

/** Calls `onChange` when another song starts, not on the first render. */
export function useTrackChange(
  trackId: string | undefined,
  onChange: () => void,
) {
  const last = useRef(trackId);
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (trackId && last.current && trackId !== last.current) {
      callback.current();
    }
    last.current = trackId;
  }, [trackId]);
}

/** Runs `tick` every `ms` while `running`; used by step-based animations. */
export function useTicker(running: boolean, ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setTick(value => value + 1), ms);
    return () => clearInterval(timer);
  }, [ms, running]);
  return tick;
}

/** A tappable area that seeks to where it was touched, horizontally. */
export function SeekArea({
  kit,
  style,
  children,
  label = 'Cambiar la posición de la canción',
}: {
  kit: PlayerKit;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  label?: string;
}) {
  const width = useRef(1);
  return (
    <Pressable
      accessibilityActions={[
        { name: 'increment', label: 'Avanzar 10 segundos' },
        { name: 'decrement', label: 'Retroceder 10 segundos' },
      ]}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: formatTime(kit.position) }}
      disabled={!kit.ready || kit.duration <= 0}
      onAccessibilityAction={event => {
        const delta = event.nativeEvent.actionName === 'increment' ? 10 : -10;
        kit.seekTo((kit.position + delta) / kit.duration);
      }}
      onLayout={(event: LayoutChangeEvent) => {
        width.current = Math.max(1, event.nativeEvent.layout.width);
      }}
      onPress={event => kit.seekTo(event.nativeEvent.locationX / width.current)}
      style={style}
    >
      {children}
    </Pressable>
  );
}

/** The top strip of a player: dragging it down closes the player. */
export function DragHeader({
  gesture,
  style,
  children,
}: {
  gesture: ReturnType<typeof Gesture.Pan>;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={style}>
        {children}
      </View>
    </GestureDetector>
  );
}
