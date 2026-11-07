import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { createStyles, spacing, useColors } from '../theme/theme';
import { clamp } from './playerMotion';

const rangeHeight = 112;
const toGain = (y: number) => {
  'worklet';
  return Math.round(12 - clamp(y / rangeHeight, 0, 1) * 24);
};

export function EqualizerBandControl({
  label,
  frequency,
  value,
  enabled,
  onChange,
}: {
  label: string;
  frequency: string;
  value: number;
  enabled: boolean;
  onChange: (value: number) => void;
}) {
  const { type } = useColors();
  const styles = useStyles();
  const preview = useSharedValue(value);
  const active = useSharedValue(false);
  useEffect(() => {
    if (!active.value) preview.value = value;
  }, [active, preview, value]);

  const move = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY([-4, 4])
    .onStart(event => {
      active.value = true;
      preview.value = toGain(event.y);
    })
    .onUpdate(event => {
      preview.value = toGain(event.y);
    })
    .onFinalize((_event, success) => {
      if (!active.value) return;
      active.value = false;
      if (success) scheduleOnRN(onChange, preview.value);
      else preview.value = value;
    });
  const tap = Gesture.Tap()
    .enabled(enabled)
    .onEnd((event, success) => {
      if (!success) return;
      preview.value = toGain(event.y);
      scheduleOnRN(onChange, preview.value);
    });
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ((12 - preview.value) / 24) * rangeHeight }],
  }));
  const gainStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: Math.max(0, preview.value / 12) }],
  }));
  const cutStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: Math.max(0, -preview.value / 12) }],
  }));

  return (
    <View style={[styles.band, !enabled && styles.off]}>
      <Text style={[type.caption, styles.center]}>{frequency}</Text>
      <GestureDetector gesture={Gesture.Exclusive(move, tap)}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${label}, ${frequency}`}
          accessibilityState={{ disabled: !enabled }}
          accessibilityValue={{
            min: -12,
            max: 12,
            now: value,
            text: `${value} dB`,
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Aumentar un decibel' },
            { name: 'decrement', label: 'Reducir un decibel' },
          ]}
          onAccessibilityAction={event => {
            if (enabled) {
              const step =
                event.nativeEvent.actionName === 'increment' ? 1 : -1;
              onChange(clamp(value + step, -12, 12));
            }
          }}
          style={styles.touch}
        >
          <View pointerEvents="none" style={styles.rail}>
            <Animated.View style={[styles.gain, gainStyle]} />
            <Animated.View style={[styles.cut, cutStyle]} />
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.thumb, thumbStyle]}
          />
        </View>
      </GestureDetector>
      <Text style={[type.label, styles.center]}>
        {value > 0 ? '+' : ''}
        {value} dB
      </Text>
      <Text style={[type.caption, styles.center]}>{label}</Text>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  band: {
    flex: 1,
    minWidth: 54,
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  off: { opacity: 0.45 },
  center: { textAlign: 'center' },
  touch: {
    width: 48,
    height: rangeHeight,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  rail: {
    width: 4,
    height: rangeHeight,
    borderRadius: colors.design.radius.full,
    backgroundColor: colors.outline,
  },
  gain: {
    height: rangeHeight / 2,
    backgroundColor: colors.accent,
    transformOrigin: 'bottom',
  },
  cut: {
    height: rangeHeight / 2,
    backgroundColor: colors.accent,
    transformOrigin: 'top',
  },
  thumb: {
    position: 'absolute',
    top: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
}));
