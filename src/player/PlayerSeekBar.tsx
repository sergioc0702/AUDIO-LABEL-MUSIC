import { memo, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { createStyles, radius, useColors } from '../theme/theme';
import { formatTime } from '../utils/formatTime';
import { usePlaybackProgress } from './PlaybackProgress';
import { clamp } from './playerMotion';

export const PlayerSeekBar = memo(function PlayerSeekBarContent({
  disabled,
  onSeek,
}: {
  disabled: boolean;
  onSeek: (position: number) => Promise<boolean>;
}) {
  const { position, duration } = usePlaybackProgress();
  const { type } = useColors();
  const styles = useStyles();
  const [previewSecond, setPreviewSecond] = useState<number | null>(null);
  const width = useSharedValue(0);
  const confirmed = useSharedValue(0);
  const preview = useSharedValue(0);
  const dragging = useSharedValue(false);
  const pending = useSharedValue(false);
  const lastPreviewLabel = useSharedValue(0);
  const mounted = useRef(true);
  const operation = useRef(false);
  const sample = useRef(position);
  sample.current = position;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    confirmed.value = duration > 0 ? clamp(position / duration, 0, 1) : 0;
  }, [confirmed, duration, position]);

  async function commit(ratio: number) {
    if (operation.current) return;
    if (duration <= 0 || disabled) {
      pending.value = false;
      return;
    }
    const target = clamp(ratio, 0, 1);
    operation.current = true;
    preview.value = target;
    pending.value = true;
    let succeeded = false;
    try {
      succeeded = await onSeek(target * duration);
    } finally {
      operation.current = false;
      if (mounted.current) {
        confirmed.value = succeeded
          ? target
          : clamp(sample.current / duration, 0, 1);
        pending.value = false;
      }
    }
  }

  useAnimatedReaction(
    () => (dragging.value ? Math.floor(preview.value * duration) : null),
    (second, previous) => {
      if (second === null) {
        lastPreviewLabel.value = 0;
        scheduleOnRN(setPreviewSecond, null);
      } else if (second !== previous) {
        const now = Date.now();
        if (now - lastPreviewLabel.value >= 80) {
          lastPreviewLabel.value = now;
          scheduleOnRN(setPreviewSecond, second);
        }
      }
    },
    [duration],
  );

  const move = Gesture.Pan()
    .enabled(!disabled && duration > 0)
    .activeOffsetX([-5, 5])
    .failOffsetY([-12, 12])
    .onStart(event => {
      if (pending.value || width.value <= 0) return;
      preview.value = clamp(event.x / width.value, 0, 1);
      dragging.value = true;
    })
    .onUpdate(event => {
      if (dragging.value) preview.value = clamp(event.x / width.value, 0, 1);
    })
    .onEnd((_event, success) => {
      if (success && dragging.value) {
        pending.value = true;
        scheduleOnRN(commit, preview.value);
      }
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  const tap = Gesture.Tap()
    .enabled(!disabled && duration > 0)
    .onEnd((event, success) => {
      if (!success || pending.value || width.value <= 0) return;
      preview.value = clamp(event.x / width.value, 0, 1);
      pending.value = true;
      scheduleOnRN(commit, preview.value);
    });
  const fillStyle = useAnimatedStyle(() => {
    const ratio =
      dragging.value || pending.value ? preview.value : confirmed.value;
    return { transform: [{ scaleX: ratio }] };
  });
  const thumbStyle = useAnimatedStyle(() => {
    const ratio =
      dragging.value || pending.value ? preview.value : confirmed.value;
    return {
      transform: [
        { translateX: ratio * width.value },
        { scale: dragging.value ? 1.25 : 1 },
      ],
    };
  });
  const elapsed = clamp(previewSecond ?? position, 0, Math.max(duration, 0));

  return (
    <View>
      <GestureDetector gesture={Gesture.Exclusive(move, tap)}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Avanzar en la canción"
          accessibilityState={{ disabled: disabled || duration <= 0 }}
          accessibilityValue={{
            min: 0,
            max: Math.ceil(duration),
            now: Math.floor(elapsed),
            text: formatTime(elapsed),
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Avanzar 10 segundos' },
            { name: 'decrement', label: 'Retroceder 10 segundos' },
          ]}
          onAccessibilityAction={event => {
            if (duration <= 0) return;
            const delta =
              event.nativeEvent.actionName === 'increment' ? 10 : -10;
            commit((position + delta) / duration);
          }}
          onLayout={event => {
            width.value = event.nativeEvent.layout.width;
          }}
          style={styles.touchArea}
        >
          <View pointerEvents="none" style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.thumb, thumbStyle]}
          />
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <Text style={[type.caption, styles.time]}>{formatTime(elapsed)}</Text>
        <Text style={[type.caption, styles.time]}>
          -{formatTime(duration - elapsed)}
        </Text>
      </View>
    </View>
  );
});

const useStyles = createStyles(colors => ({
  touchArea: { height: 48, justifyContent: 'center', marginHorizontal: 8 },
  track: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.outline,
  },
  fill: { height: 4, backgroundColor: colors.accent, transformOrigin: 'left' },
  thumb: {
    position: 'absolute',
    left: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontVariant: ['tabular-nums'] },
}));
