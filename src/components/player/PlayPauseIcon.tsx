import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import { motionDuration, motionEasing } from '../../theme/motion';

/** Turns one symbol into the other so the change of state reads as a single gesture. */
export function PlayPauseIcon({
  isPlaying,
  color,
  size,
}: {
  isPlaying: boolean;
  color: string;
  size: number;
}) {
  const progress = useRef(new Animated.Value(isPlaying ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isPlaying ? 1 : 0,
      duration: motionDuration.state,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, progress]);

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
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.5],
                }),
              },
            ],
          },
        ]}
      >
        <Play color={color} fill={color} size={size} />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: progress,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Pause color={color} fill={color} size={size} />
      </Animated.View>
    </View>
  );
}
