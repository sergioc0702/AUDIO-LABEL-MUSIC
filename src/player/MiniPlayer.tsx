import { useRef } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SkipForward } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { createStyles, radius, spacing, useColors } from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { Tap } from '../ui/Tap';
import { PlayPauseIcon } from './PlayPauseIcon';
import { usePlaybackProgress } from './PlaybackProgress';
import { acceptsSwipe, clamp, playerMotion } from './playerMotion';

function MiniPosition() {
  const { position, duration } = usePlaybackProgress();
  const styles = useStyles();
  return (
    <View style={styles.progress}>
      <View
        style={[
          styles.progressFill,
          {
            transform: [
              { scaleX: duration > 0 ? clamp(position / duration, 0, 1) : 0 },
            ],
          },
        ]}
      />
    </View>
  );
}

export function MiniPlayer() {
  const { music } = useApp();
  const {
    currentTrack: track,
    isPlaying,
    playerExpanded,
    playerReady,
    queueUpdating,
    setPlayerExpanded,
    skipTrack,
    togglePlayback,
  } = music;
  const { colors, type } = useColors();
  const styles = useStyles();
  const shift = useSharedValue(0);
  const busy = useSharedValue(false);
  const inFlight = useRef(false);
  const expand = () => setPlayerExpanded(true);
  const duration = playerMotion.settle;

  async function skip(direction: 'next' | 'previous') {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (playerReady && !queueUpdating) await skipTrack(direction);
    } finally {
      inFlight.current = false;
      busy.value = false;
      shift.value = withTiming(0, {
        duration,
        reduceMotion: ReduceMotion.System,
      });
    }
  }

  const horizontal = Gesture.Pan()
    .enabled(playerReady && !queueUpdating)
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onUpdate(event => {
      if (!busy.value) shift.value = clamp(event.translationX * 0.65, -68, 68);
    })
    .onFinalize((event, success) => {
      if (busy.value) return;
      if (success && acceptsSwipe(event.translationX, event.velocityX, 64)) {
        busy.value = true;
        scheduleOnRN(skip, event.translationX < 0 ? 'next' : 'previous');
      } else {
        shift.value = withTiming(0, {
          duration,
          reduceMotion: ReduceMotion.System,
        });
      }
    });
  const upwards = Gesture.Pan()
    .activeOffsetY(-10)
    .failOffsetX([-14, 14])
    .onEnd((event, success) => {
      if (
        success &&
        event.translationY < 0 &&
        acceptsSwipe(event.translationY, event.velocityY, 36)
      ) {
        scheduleOnRN(expand);
      }
    });
  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  if (!track) return null;

  return (
    <View style={styles.dock}>
      <View style={styles.row}>
        <GestureDetector gesture={Gesture.Race(horizontal, upwards)}>
          <View collapsable={false} style={styles.trackArea}>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Abrir reproductor: ${track.title} de ${track.artist}`}
              accessibilityHint="Desliza hacia arriba para abrir o a los lados para cambiar de canción"
              onPress={expand}
              style={styles.trackTouch}
            >
              <Animated.View style={[styles.song, artworkStyle]}>
                <Cover size={44} uri={track.artwork} />
                <View style={styles.info}>
                  <Text numberOfLines={1} style={type.bodyStrong}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={type.caption}>
                    {track.artist}
                  </Text>
                </View>
              </Animated.View>
            </Tap>
          </View>
        </GestureDetector>
        <IconButton
          disabled={!playerReady}
          label={isPlaying ? 'Pausar' : 'Reproducir'}
          onPress={togglePlayback}
        >
          <PlayPauseIcon color={colors.text} isPlaying={isPlaying} size={24} />
        </IconButton>
        <IconButton
          disabled={!playerReady || queueUpdating}
          label="Siguiente canción"
          onPress={() => skip('next')}
        >
          <SkipForward color={colors.text} fill={colors.text} size={24} />
        </IconButton>
      </View>
      {playerExpanded ? <View style={styles.progress} /> : <MiniPosition />}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  dock: {
    marginHorizontal: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingRight: spacing.xs,
  },
  trackArea: { flex: 1, minWidth: 0, overflow: 'hidden' },
  trackTouch: {
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  song: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, minWidth: 0, gap: 2 },
  progress: { height: 2, backgroundColor: colors.outline },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
    transformOrigin: 'left',
  },
}));
