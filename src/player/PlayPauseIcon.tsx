import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motionDuration, motionEasing } from '../theme/motion';

export function PlayPauseIcon({
  isPlaying,
  color,
  size,
}: {
  isPlaying: boolean;
  color: string;
  size: number;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(isPlaying ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: isPlaying ? 1 : 0,
      duration: reducedMotion ? 0 : motionDuration.feedback,
      easing: motionEasing.enter,
      isInteraction: false,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isPlaying, progress, reducedMotion]);

  return (
    <View style={{ height: size, width: size }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <Play color={color} fill={color} size={size} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pause color={color} fill={color} size={size} />
      </Animated.View>
    </View>
  );
}
