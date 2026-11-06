import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { motionDuration, motionEasing } from '../../../theme/motion';
import type { PlayerSceneProps } from './PlayerScene';

const lights = [
  { x: -0.3, y: -0.12, size: 1.3, opacity: 0.3, travel: 0.1, pace: 1 },
  { x: 0.42, y: 0.16, size: 1.05, opacity: 0.24, travel: 0.14, pace: 1.35 },
  { x: -0.18, y: 0.62, size: 1.2, opacity: 0.14, travel: 0.12, pace: 1.7 },
];

function AuroraLight({
  color,
  index,
  active,
  driftMs,
  intensity,
}: {
  color: string;
  index: number;
  active: boolean;
  driftMs: number;
  intensity: number;
}) {
  const { width, height } = useWindowDimensions();
  const light = lights[index];
  const drift = useRef(new Animated.Value(0)).current;
  const size = width * light.size;
  const travel = width * light.travel * intensity;
  const gradientId = `aurora-${index}`;

  useEffect(() => {
    if (!active) {
      return;
    }
    const duration = driftMs * light.pace;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration,
          easing: motionEasing.loop,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration,
          easing: motionEasing.loop,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, drift, driftMs, light.pace]);

  return (
    <Animated.View
      renderToHardwareTextureAndroid
      style={[
        styles.light,
        {
          height: size,
          left: width * light.x,
          top: height * light.y,
          width: size,
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-travel, travel],
              }),
            },
            {
              translateY: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [travel * 0.7, -travel * 0.7],
              }),
            },
            {
              scale: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1 + 0.16 * intensity],
              }),
            },
          ],
        },
      ]}
    >
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={light.opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="50%" r="50%" fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

/** Slow light behind the player that rises while music plays and rests on pause. */
export function AuroraScene({
  glows,
  motion,
  active,
  reducedMotion,
}: PlayerSceneProps) {
  const energy = useRef(
    new Animated.Value(active ? 1 : motion.restingEnergy),
  ).current;

  useEffect(() => {
    Animated.timing(energy, {
      toValue: active ? 1 : motion.restingEnergy,
      duration: reducedMotion ? 0 : motionDuration.enter * 2,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start();
  }, [active, energy, motion.restingEnergy, reducedMotion]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: energy }]}>
      {glows.map((color, index) => (
        <AuroraLight
          key={index}
          active={active && !reducedMotion}
          color={color}
          driftMs={motion.driftMs}
          index={index}
          intensity={motion.intensity}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  light: {
    position: 'absolute',
  },
});
